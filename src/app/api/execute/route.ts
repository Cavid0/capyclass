import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Language mapping: Monaco language id -> Piston language + version
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
    javascript: { language: "javascript", version: "18.15.0" },
    typescript: { language: "typescript", version: "5.0.3" },
    python: { language: "python", version: "3.10.0" },
    c: { language: "c", version: "10.2.0" },
    cpp: { language: "c++", version: "10.2.0" },
    csharp: { language: "csharp", version: "6.12.0" },
    java: { language: "java", version: "15.0.2" },
    go: { language: "go", version: "1.16.2" },
    ruby: { language: "ruby", version: "3.0.1" },
    php: { language: "php", version: "8.2.3" },
    rust: { language: "rust", version: "1.68.2" },
    swift: { language: "swift", version: "5.3.3" },
    kotlin: { language: "kotlin", version: "1.8.20" },
};

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const { code, language } = await req.json();

        if (!code || !language) {
            return NextResponse.json({ error: "Kod və dil tələb olunur" }, { status: 400 });
        }

        const langConfig = LANGUAGE_MAP[language];
        if (!langConfig) {
            return NextResponse.json({ error: `"${language}" dili dəstəklənmir` }, { status: 400 });
        }

        // Call Piston API
        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: langConfig.language,
                version: langConfig.version,
                files: [{ content: code }],
                stdin: "",
                compile_timeout: 10000,
                run_timeout: 5000,
                compile_memory_limit: -1,
                run_memory_limit: -1,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Piston API error:", errorText);
            return NextResponse.json({
                error: "Kod icra edilərkən xəta baş verdi",
                output: errorText
            }, { status: 500 });
        }

        const result = await response.json();

        // Combine compile and run output
        const compileOutput = result.compile?.output || "";
        const runOutput = result.run?.output || "";
        const runStderr = result.run?.stderr || "";
        const compileStderr = result.compile?.stderr || "";

        const hasError = !!(compileStderr || runStderr || result.compile?.code !== 0 && result.compile);

        let output = "";
        if (compileStderr) {
            output = `[Compile Error]\n${compileStderr}`;
        } else if (runStderr) {
            output = runOutput ? `${runOutput}\n[Error]\n${runStderr}` : `[Error]\n${runStderr}`;
        } else {
            output = runOutput || compileOutput || "(Çıxış yoxdur)";
        }

        return NextResponse.json({
            output: output.substring(0, 10000), // Limit output size
            exitCode: result.run?.code ?? result.compile?.code ?? 0,
            hasError,
        });
    } catch (error) {
        console.error("Execute code error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}
