import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeCode } from "@/lib/ai-engine";

// POST: Save code and trigger AI analysis
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const workspaceId = params.id;

        // Verify ownership
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace tapılmadı" }, { status: 404 });
        }

        if (workspace.studentId !== userId) {
            return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
        }

        const { code, language } = await req.json();

        // Update workspace code
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: { code, language: language || workspace.language },
        });

        // Run AI analysis
        const analysis = await analyzeCode(code, language || workspace.language);

        // Save AI feedback
        const feedback = await prisma.aIFeedback.create({
            data: {
                workspaceId,
                summary: analysis.summary,
                errors: JSON.stringify(analysis.errors),
                suggestions: JSON.stringify(analysis.suggestions),
                status: analysis.status === "PASS" ? "PASS" : analysis.status === "FAIL" ? "FAIL" : "PENDING",
            },
        });

        // Update workspace status
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                status: analysis.status === "PASS" ? "PASS" : analysis.status === "FAIL" ? "FAIL" : "PENDING",
            },
        });

        return NextResponse.json({
            feedback: {
                ...feedback,
                errors: analysis.errors,
                suggestions: analysis.suggestions,
            },
            status: analysis.status,
        });
    } catch (error) {
        console.error("Save workspace error:", error);
        return NextResponse.json(
            { error: "Kod saxlanarkən xəta baş verdi" },
            { status: 500 }
        );
    }
}
