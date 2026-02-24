import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeCode } from "@/lib/ai-engine";

// POST: Standalone AI analysis (without saving)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const { code, language } = await req.json();

        if (!code) {
            return NextResponse.json(
                { error: "Kod tələb olunur" },
                { status: 400 }
            );
        }

        const analysis = await analyzeCode(code, language || "javascript");

        return NextResponse.json(analysis);
    } catch (error) {
        console.error("AI Analysis error:", error);
        return NextResponse.json(
            { error: "Analiz zamanı xəta baş verdi" },
            { status: 500 }
        );
    }
}
