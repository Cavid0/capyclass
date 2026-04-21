import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";

// Monaco language id → Piston language name
const PISTON_LANGUAGE_MAP: Record<string, string> = {
    javascript: "javascript",
    typescript: "typescript",
    python: "python",
    c: "c",
    cpp: "c++",
    csharp: "csharp.net",
    java: "java",
    go: "go",
    ruby: "ruby",
    php: "php",
    rust: "rust",
    swift: "swift",
};

// Java needs a Main class wrapper if the user just wrote loose statements
function wrapJavaCode(code: string): string {
    if (code.includes("public static void main")) return code;
    return `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
}

// In-memory response cache — same (language, code) runs return instantly for ~60s.
// Bounded size prevents unbounded growth in long-lived server processes.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 500;
const responseCache = new Map<string, { result: ExecuteResult; expiresAt: number }>();

interface ExecuteResult {
    output: string;
    exitCode: number;
    hasError: boolean;
}

function cacheKey(language: string, code: string): string {
    return createHash("sha256").update(`${language}\u0000${code}`).digest("hex");
}

function readCache(key: string): ExecuteResult | null {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        responseCache.delete(key);
        return null;
    }
    // Refresh LRU order
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

interface PistonResponse {
    run?: { stdout?: string; stderr?: string; code?: number; signal?: string | null; output?: string };
    compile?: { stdout?: string; stderr?: string; code?: number; signal?: string | null };
    message?: string;
}

function formatPistonResult(data: PistonResponse): ExecuteResult {
    const compileStderr = data.compile?.stderr?.trim() || "";
    const compileCode = data.compile?.code ?? 0;
    const runStdout = data.run?.stdout || "";
    const runStderr = data.run?.stderr || "";
    const runCode = data.run?.code ?? 0;
    const runSignal = data.run?.signal || "";

    const hasError = compileCode !== 0 || runCode !== 0 || !!runSignal;

    let output = "";
    if (compileStderr && compileCode !== 0) {
        output = `[Compile Error]\n${compileStderr}`;
    } else if (runStderr && !runStdout) {
        output = `[Error]\n${runStderr}`;
    } else if (runStderr && runStdout) {
        output = `${runStdout}\n[Stderr]\n${runStderr}`;
    } else if (runStdout) {
        output = runStdout;
    } else {
        output = "(No output)";
    }

    if (runSignal) output += `\n[Signal: ${runSignal}]`;

    return {
        output: output.slice(0, 10_000),
        exitCode: runCode,
        hasError,
    };
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        if (!rateLimit(`execute:${userId}`, 20, 60 * 1000)) {
            return NextResponse.json({ error: "Too many executions. Please wait a moment." }, { status: 429 });
        }

        const { code, language } = await req.json();

        if (typeof code !== "string" || typeof language !== "string") {
            return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
        }

        if (code.length > 50_000) {
            return NextResponse.json({ error: "Code is too large. Maximum 50KB allowed." }, { status: 400 });
        }

        if (language === "html" || language === "kotlin") {
            return NextResponse.json({ error: "This language cannot be executed on the server" }, { status: 400 });
        }

        const pistonLanguage = PISTON_LANGUAGE_MAP[language];
        if (!pistonLanguage) {
            return NextResponse.json({ error: `Language "${language}" is not supported` }, { status: 400 });
        }

        const finalCode = language === "java" ? wrapJavaCode(code) : code;

        // Cache lookup — repeated "Run" of identical code returns instantly
        const key = cacheKey(language, finalCode);
        const cached = readCache(key);
        if (cached) {
            return NextResponse.json({ ...cached, cached: true });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);
        let response: Response;
        try {
            response = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: pistonLanguage,
                    version: "*",
                    files: [{ content: finalCode }],
                }),
                signal: controller.signal,
            });
        } catch (err: any) {
            if (err?.name === "AbortError") {
                return NextResponse.json(
                    { error: "Execution timed out. Try simpler code.", output: "", hasError: true },
                    { status: 504 }
                );
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Piston API error:", response.status, errorText);
            return NextResponse.json(
                { error: "An error occurred while executing the code", output: errorText, hasError: true },
                { status: 500 }
            );
        }

        const data: PistonResponse = await response.json();

        if (data.message) {
            return NextResponse.json(
                { output: `[Error]\n${data.message}`, exitCode: 1, hasError: true },
                { status: 200 }
            );
        }

        const result = formatPistonResult(data);
        writeCache(key, result);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Execute code error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
