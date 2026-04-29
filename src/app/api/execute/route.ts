import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createHash, randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CODE_SIZE = 50_000;
const MAX_INPUT_SIZE = 10_000;
const MAX_OUTPUT_SIZE = 10_000;
const EXECUTION_TIMEOUT_MS = 10_000;
const COMPILE_TIMEOUT_MS = 15_000;
const WAITING_FOR_INPUT_MS = 250;
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;

interface ExecuteResult {
    output: string;
    exitCode: number;
    hasError: boolean;
    needsInput?: boolean;
}

interface CommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    waitingForInput: boolean;
    signal: NodeJS.Signals | null;
}

const responseCache = new Map<string, { result: ExecuteResult; expiresAt: number }>();

function jsonError(message: string, status = 400, output = ""): NextResponse {
    return NextResponse.json({ error: message, output: output || message, exitCode: 1, hasError: true }, { status });
}

async function safeJson(req: NextRequest): Promise<unknown> {
    try {
        return await req.json();
    } catch {
        return null;
    }
}

function cacheKey(language: string, code: string, input: string): string {
    return createHash("sha256").update(`${language}\u0000${code}\u0000${input}`).digest("hex");
}

function readCache(key: string): ExecuteResult | null {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key);
        return null;
    }
    responseCache.delete(key);
    responseCache.set(key, entry);
    return entry.result;
}

function writeCache(key: string, result: ExecuteResult): void {
    if (responseCache.size >= CACHE_MAX_ENTRIES) {
        const oldest = responseCache.keys().next().value;
        if (oldest) responseCache.delete(oldest);
    }
    responseCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCommandCandidates(command: string): string[] {
    const pathDirs = (process.env.PATH || "")
        .split(path.delimiter)
        .filter(Boolean)
        .map((dir) => path.join(dir, command));

    return [
        ...(command === "node" ? [process.execPath] : []),
        ...pathDirs,
        `/opt/homebrew/bin/${command}`,
        `/usr/local/bin/${command}`,
        `/usr/bin/${command}`,
        `/bin/${command}`,
    ];
}

function commandExists(command: string): boolean {
    return getCommandCandidates(command).some((candidate) => existsSync(candidate));
}

function resolveCommand(command: string): string {
    return getCommandCandidates(command).find((candidate) => existsSync(candidate)) || command;
}

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number, input = "", keepStdinOpen = false): Promise<CommandResult> {
    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let settled = false;
        let timedOut = false;
        let waitingForInput = false;

        const child = spawn(resolveCommand(command), args, {
            cwd,
            shell: false,
            windowsHide: true,
            env: {
                NODE_ENV: process.env.NODE_ENV || "production",
                PATH: process.env.PATH || "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
                HOME: cwd,
                TMPDIR: cwd,
                LANG: "C.UTF-8",
            },
            stdio: ["pipe", "pipe", "pipe"],
        });

        if (input) child.stdin.write(input.endsWith("\n") ? input : `${input}\n`);
        if (!keepStdinOpen) child.stdin.end();

        const finish = (exitCode: number, signal: NodeJS.Signals | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            clearTimeout(inputTimer);
            resolve({
                stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
                stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
                exitCode,
                timedOut,
                waitingForInput,
                signal,
            });
        };

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGKILL");
        }, timeoutMs);

        const inputTimer = setTimeout(() => {
            if (keepStdinOpen && !settled && stdout.trim()) {
                waitingForInput = true;
                child.kill("SIGKILL");
            }
        }, WAITING_FOR_INPUT_MS);

        child.stdout.on("data", (chunk) => {
            stdout = (stdout + chunk.toString()).slice(0, MAX_OUTPUT_SIZE);
        });
        child.stderr.on("data", (chunk) => {
            stderr = (stderr + chunk.toString()).slice(0, MAX_OUTPUT_SIZE);
        });
        child.on("error", (error) => {
            stderr += error.message;
            finish(127, null);
        });
        child.on("close", (code, signal) => finish(code ?? (signal ? 1 : 0), signal));
    });
}

function sanitizeOutput(value: string, cwd: string): string {
    const privateCwd = cwd.startsWith("/var/") ? `/private${cwd}` : cwd;

    return value
        // Hide temporary sandbox paths before doing generic replacements. Otherwise
        // macOS can turn "/private/var/..." into the confusing "/private./main.js".
        .replace(/\/private\/var\/folders\/[^\s:)]+\/classedu-run-[^\s:)]+\//g, "./")
        .replace(/\/var\/folders\/[^\s:)]+\/classedu-run-[^\s:)]+\//g, "./")
        .replaceAll(`${privateCwd}/`, "./")
        .replaceAll(privateCwd, ".")
        .replaceAll(`${cwd}/`, "./")
        .replaceAll(cwd, ".")
        .slice(0, MAX_OUTPUT_SIZE);
}

function compactRuntimeError(stderr: string): string {
    // Node.js prints a long internal stack trace. For classroom use the useful
    // part is the user-file location, caret line and the actual error message.
    const lines = stderr
        .split("\n")
        .filter((line) => !line.startsWith("    at Module."))
        .filter((line) => !line.startsWith("    at node:"))
        .filter((line) => !line.startsWith("    at wrapModuleLoad"))
        .filter((line) => !line.startsWith("Node.js v"));

    return lines.join("\n").trim();
}

function echoInputLikeTerminal(stdout: string, input: string): string {
    const inputLines = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    if (!stdout || inputLines.length === 0) return stdout;

    let output = stdout;
    let cursor = 0;

    for (const line of inputLines) {
        // Echo the submitted answers after each prompt. Programs such as
        // Node readline print prompts without a newline, while stdin is not
        // automatically visible in captured stdout. Adding the typed value and
        // a newline makes output match a real terminal / Programiz style:
        // "Prompt: value" then the next prompt/result starts under it.
        let promptMatch: RegExpExecArray | null = null;
        let searchFrom = cursor;

        while (searchFrom < output.length) {
            const rest = output.slice(searchFrom);
            const match = /[:?>]\s*/.exec(rest);
            if (!match) break;

            const absoluteIndex = searchFrom + match.index;
            const lineStart = output.lastIndexOf("\n", absoluteIndex) + 1;
            const promptText = output.slice(lineStart, absoluteIndex).toLocaleLowerCase("az-AZ");

            // Do not echo a submitted value after result/output labels. The
            // last printed line can be "Nəticə: -11"; if we treat that colon as
            // another prompt, the terminal becomes "Nəticə: 23\n-11".
            if (/\b(result|output)\b|nəticə|netice/.test(promptText)) {
                searchFrom = absoluteIndex + match[0].length;
                continue;
            }

            promptMatch = Object.assign(match, { index: absoluteIndex - cursor });
            break;
        }

        if (!promptMatch) break;

        const insertAt = cursor + promptMatch.index + promptMatch[0].length;
        const alreadyEchoed = output.slice(insertAt, insertAt + line.length) === line;
        if (alreadyEchoed) {
            cursor = insertAt + line.length;
            continue;
        }

        output = `${output.slice(0, insertAt)}${line}\n${output.slice(insertAt)}`;
        cursor = insertAt + line.length + 1;
    }

    return output;
}

function looksInteractive(language: string, code: string): boolean {
    if (language === "python") return /\binput\s*\(/.test(code);
    if (language === "javascript" || language === "typescript") return /readline|process\.stdin|prompt\s*\(/.test(code);
    if (language === "java") return /\bScanner\b|System\.in|BufferedReader/.test(code);
    if (language === "c" || language === "cpp") return /\bscanf\s*\(|\bcin\b|getline\s*\(/.test(code);
    return /stdin|readline|input\s*\(/i.test(code);
}

function formatCommandResult(result: CommandResult, cwd: string, input = ""): ExecuteResult {
    const hasError = result.exitCode !== 0 || result.timedOut || Boolean(result.signal) || Boolean(result.stderr && !result.stdout);
    let output = "";

    const stdout = echoInputLikeTerminal(sanitizeOutput(result.stdout, cwd), input);
    const stderr = compactRuntimeError(sanitizeOutput(result.stderr, cwd));

    if (stderr.includes("EOFError: EOF when reading a line") || result.waitingForInput) {
        return { output: (stdout || "").slice(0, MAX_OUTPUT_SIZE), exitCode: 0, hasError: false, needsInput: true };
    }

    if (hasError) {
        if (stderr) output += `[Runtime Error]\n${stderr}`;
        // If the program crashes after printing something, do not mix successful
        // output with the error by default. It confused users into thinking the
        // compiler succeeded. The real failure is shown above.
    } else {
        if (stdout) output += stdout;
        if (stderr) output += `${output ? "\n" : ""}[Stderr]\n${stderr}`;
    }
    if (result.timedOut) output += `${output ? "\n" : ""}[Timeout]\nExecution stopped after ${EXECUTION_TIMEOUT_MS / 1000}s.`;
    if (result.signal && !result.timedOut) output += `${output ? "\n" : ""}[Signal: ${result.signal}]`;
    if (!output) output = "(No output)";

    return { output: output.slice(0, MAX_OUTPUT_SIZE), exitCode: result.exitCode, hasError };
}

function compileError(result: CommandResult, cwd: string): ExecuteResult {
    return {
        output: `[Compile Error]\n${sanitizeOutput(result.stderr || result.stdout || "Compilation failed.", cwd)}`,
        exitCode: result.exitCode || 1,
        hasError: true,
    };
}

function stripTypeScript(code: string): string {
    return code
        .replace(/:\s*[A-Za-z_$][\w$<>,\[\] |&?]*(?=\s*[,)=;{])/g, "")
        .replace(/interface\s+\w+\s*{[^}]*}/g, "")
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, "");
}

function wrapJavaCode(code: string): string {
    if (/public\s+static\s+void\s+main\s*\(/.test(code) || /class\s+Main\b/.test(code)) return code;
    return `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
}

async function executeLocally(language: string, code: string, input = ""): Promise<ExecuteResult> {
    const workDir = path.join(tmpdir(), `classedu-run-${randomUUID()}`);
    await mkdir(workDir, { recursive: true, mode: 0o700 });
    const interactive = looksInteractive(language, code);

    try {
        switch (language) {
            case "javascript": {
                if (!commandExists("node")) return jsonResult("Node.js is not installed on this server.");
                await writeFile(path.join(workDir, "main.js"), code, "utf8");
                const checked = await runCommand("node", ["--check", "main.js"], workDir, COMPILE_TIMEOUT_MS);
                if (checked.exitCode !== 0) return compileError(checked, workDir);
                return formatCommandResult(await runCommand("node", ["main.js"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "typescript": {
                if (!commandExists("node")) return jsonResult("Node.js is not installed on this server.");
                await writeFile(path.join(workDir, "main.js"), stripTypeScript(code), "utf8");
                const checked = await runCommand("node", ["--check", "main.js"], workDir, COMPILE_TIMEOUT_MS);
                if (checked.exitCode !== 0) return compileError(checked, workDir);
                return formatCommandResult(await runCommand("node", ["main.js"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "python": {
                if (!commandExists("python3")) return jsonResult("Python 3 is not installed on this server.");
                await writeFile(path.join(workDir, "main.py"), code, "utf8");
                return formatCommandResult(await runCommand("python3", ["main.py"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "ruby": {
                if (!commandExists("ruby")) return jsonResult("Ruby is not installed on this server.");
                await writeFile(path.join(workDir, "main.rb"), code, "utf8");
                return formatCommandResult(await runCommand("ruby", ["main.rb"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "c": {
                if (!commandExists("gcc")) return jsonResult("C compiler (gcc) is not installed on this server.");
                await writeFile(path.join(workDir, "main.c"), code, "utf8");
                const compiled = await runCommand("gcc", ["main.c", "-o", "main"], workDir, COMPILE_TIMEOUT_MS);
                if (compiled.exitCode !== 0) return compileError(compiled, workDir);
                return formatCommandResult(await runCommand("./main", [], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "cpp": {
                if (!commandExists("g++")) return jsonResult("C++ compiler (g++) is not installed on this server.");
                await writeFile(path.join(workDir, "main.cpp"), code, "utf8");
                const compiled = await runCommand("g++", ["main.cpp", "-std=c++17", "-o", "main"], workDir, COMPILE_TIMEOUT_MS);
                if (compiled.exitCode !== 0) return compileError(compiled, workDir);
                return formatCommandResult(await runCommand("./main", [], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "java": {
                if (!commandExists("javac") || !commandExists("java")) return jsonResult("Java JDK is not installed on this server.");
                await writeFile(path.join(workDir, "Main.java"), wrapJavaCode(code), "utf8");
                const compiled = await runCommand("javac", ["Main.java"], workDir, COMPILE_TIMEOUT_MS);
                if (compiled.exitCode !== 0) return compileError(compiled, workDir);
                return formatCommandResult(await runCommand("java", ["-cp", workDir, "Main"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "swift": {
                if (!commandExists("swift")) return jsonResult("Swift is not installed on this server.");
                await writeFile(path.join(workDir, "main.swift"), code, "utf8");
                return formatCommandResult(await runCommand("swift", ["main.swift"], workDir, EXECUTION_TIMEOUT_MS, input, interactive), workDir, input);
            }
            case "go":
                return jsonResult("Go is not installed/configured on this server.");
            case "php":
                return jsonResult("PHP is not installed/configured on this server.");
            case "rust":
                return jsonResult("Rust is not installed/configured on this server.");
            case "csharp":
                return jsonResult("C#/.NET is not installed/configured on this server.");
            default:
                return jsonResult(`Language \"${language}\" is not supported.`);
        }
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

function jsonResult(message: string): ExecuteResult {
    return { output: `[Compiler unavailable]\n${message}`, exitCode: 1, hasError: true };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return jsonError("Authentication required", 401);

        const userId = session.user.id;
        if (!rateLimit(`execute:${userId}`, 20, 60 * 1000)) {
            return jsonError("Too many executions. Please wait a moment.", 429);
        }

        const body = await safeJson(req);
        if (!body || typeof body !== "object") return jsonError("Invalid request body. JSON is required.", 400);

        const { code, language, input } = body as { code?: unknown; language?: unknown; input?: unknown };
        if (typeof code !== "string" || typeof language !== "string") return jsonError("Code and language are required", 400);
        const stdin = typeof input === "string" ? input : "";
        if (code.length > MAX_CODE_SIZE) return jsonError("Code is too large. Maximum 50KB allowed.", 400);
        if (stdin.length > MAX_INPUT_SIZE) return jsonError("Input is too large. Maximum 10KB allowed.", 400);
        if (language === "html" || language === "kotlin") return jsonError("This language cannot be executed on the server", 400);

        const finalCode = language === "java" ? wrapJavaCode(code) : code;
        const key = cacheKey(language, finalCode, stdin);
        const cached = readCache(key);
        if (cached) return NextResponse.json({ ...cached, cached: true });

        const result = await executeLocally(language, finalCode, stdin);
        writeCache(key, result);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Execute code error:", error);
        return jsonError("An unexpected error occurred while executing code", 500, "[Server Error]\nAn unexpected error occurred while executing code.");
    }
}
