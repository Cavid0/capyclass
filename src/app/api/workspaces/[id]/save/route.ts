import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CODE_SIZE = 500_000; // 500KB

// POST: Save code 
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const workspaceId = params.id;

        // Verify ownership
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
        });

        if (!workspace) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        if (workspace.studentId !== userId) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { code, language } = await req.json();

        // Input validation
        if (code === undefined || typeof code !== "string") {
            return NextResponse.json({ error: "Code content is required" }, { status: 400 });
        }

        if (code.length > MAX_CODE_SIZE) {
            return NextResponse.json({ error: "Code exceeds 500KB limit" }, { status: 400 });
        }

        // Save a version snapshot before updating (only if code actually changed)
        if (workspace.code !== code) {
            await prisma.workspaceVersion.create({
                data: {
                    workspaceId,
                    code: workspace.code,
                    language: workspace.language,
                },
            });

            // Keep only last 5 versions per workspace (500MB DB limit)
            const versions = await prisma.workspaceVersion.findMany({
                where: { workspaceId },
                orderBy: { savedAt: "desc" },
                skip: 5,
                select: { id: true },
            });
            if (versions.length > 0) {
                await prisma.workspaceVersion.deleteMany({
                    where: { id: { in: versions.map((v) => v.id) } },
                });
            }
        }

        // Update workspace code
        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: { code, language: language || workspace.language },
        });

        return NextResponse.json({ success: true, workspace: updated });
    } catch (error) {
        console.error("Save workspace error:", error);
        return NextResponse.json(
            { error: "Error saving code" },
            { status: 500 }
        );
    }
}
