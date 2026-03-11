import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Language mapping: Monaco language id -> Wandbox compiler name
// Only languages with verified working Wandbox compilers
const COMPILER_MAP: Record<string, string> = {
    javascript: "nodejs-20.17.0",
    typescript: "typescript-5.6.2",
    python: "cpython-3.12.7",
    c: "gcc-head-c",
    cpp: "gcc-head",
    csharp: "mono-6.12.0.199",
    java: "openjdk-jdk-22+36",
    go: "go-1.23.2",
    ruby: "ruby-3.4.1",
    php: "php-8.3.12",
    rust: "rust-1.82.0",
    swift: "swift-6.0.1",
};

// Java needs a Main class wrapper
function wrapJavaCode(code: string): string {
    // If user already has a class with main, don't wrap
    if (code.includes("public static void main")) return code;
    return `public class Main {\n    public static void main(String[] args) {\n        ${code}\n    }\n}`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        // Rate limit: 20 executions per minute per user
        if (!rateLimit(`execute:${userId}`, 20, 60 * 1000)) {
            return NextResponse.json({ error: "Too many executions. Please wait a moment." }, { status: 429 });
        }

        const { code, language } = await req.json();

        if (typeof code !== "string" || typeof language !== "string") {
            return NextResponse.json({ error: "Code and language are required" }, { status: 400 });
        }

        // Limit code size to prevent abuse (50KB max)
        if (code.length > 50000) {
            return NextResponse.json({ error: "Code is too large. Maximum 50KB allowed." }, { status: 400 });
        }

        if (language === "html" || language === "kotlin") {
            return NextResponse.json({ error: "This language cannot be executed on the server" }, { status: 400 });
        }

        const compiler = COMPILER_MAP[language];
        if (!compiler) {
            return NextResponse.json({ error: `Language "${language}" is not supported` }, { status: 400 });
        }

        let finalCode = code;
        // Java needs wrapping if no main method
        if (language === "java") {
            finalCode = wrapJavaCode(code);
        }

        // Call Wandbox API
        const response = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: finalCode,
                compiler: compiler,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Wandbox API error:", response.status, errorText);
            return NextResponse.json({
                error: "An error occurred while executing the code",
                output: errorText
            }, { status: 500 });
        }

        const result = await response.json();

        const programOutput = result.program_output || "";
        const programError = result.program_error || "";
        const compilerError = result.compiler_error || "";
        const compilerOutput = result.compiler_output || "";
        const statusCode = result.status || "0";
        const signal = result.signal || "";

        const hasError = statusCode !== "0" || !!signal || !!compilerError || !!programError;

        let output = "";
        if (compilerError) {
            output = `[Compile Error]\n${compilerError}`;
        } else if (programError && !programOutput) {
            output = `[Error]\n${programError}`;
        } else if (programError && programOutput) {
            output = `${programOutput}\n[Stderr]\n${programError}`;
        } else if (programOutput) {
            output = programOutput;
        } else if (compilerOutput) {
            output = compilerOutput;
        } else {
            output = "(No output)";
        }

        // If there was a signal (like SIGSEGV)
        if (signal) {
            output += `\n[Signal: ${signal}]`;
        }

        return NextResponse.json({
            output: output.substring(0, 10000), // Limit output size
            exitCode: parseInt(statusCode) || 0,
            hasError,
        });
    } catch (error) {
        console.error("Execute code error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
