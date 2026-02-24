import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Save code 
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
            return NextResponse.json({ error: "Fayl tapılmadı" }, { status: 404 });
        }

        if (workspace.studentId !== userId) {
            return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
        }

        const { code, language } = await req.json();

        // Update workspace code
        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { code, language: language || workspace.language },
        });

        return NextResponse.json({ success: true, workspace: updated });
    } catch (error) {
        console.error("Save workspace error:", error);
        return NextResponse.json(
            { error: "Kod saxlanarkən xəta baş verdi" },
            { status: 500 }
        );
    }
}
