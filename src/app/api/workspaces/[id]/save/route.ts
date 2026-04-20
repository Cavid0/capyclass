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

        // Parse body and fetch workspace in parallel
        const [body, workspace] = await Promise.all([
            req.json().catch(() => ({})),
            prisma.workspace.findUnique({ where: { id: workspaceId } }),
        ]);

        if (!workspace) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        if (workspace.studentId !== userId) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { code, language } = body;

        if (code === undefined || typeof code !== "string") {
            return NextResponse.json({ error: "Code content is required" }, { status: 400 });
        }

        if (language !== undefined && typeof language !== "string") {
            return NextResponse.json({ error: "Language is invalid" }, { status: 400 });
        }

        if (code.length > MAX_CODE_SIZE) {
            return NextResponse.json({ error: "Code exceeds 500KB limit" }, { status: 400 });
        }

        const codeChanged = workspace.code !== code;

        // Update workspace + create version in one transaction (one round-trip)
        const updated = codeChanged
            ? await prisma.$transaction([
                prisma.workspaceVersion.create({
                    data: {
                        workspaceId,
                        code: workspace.code,
                        language: workspace.language,
                    },
                }),
                prisma.workspace.update({
                    where: { id: workspaceId },
                    data: { code, language: language || workspace.language },
                }),
            ]).then(([, ws]) => ws)
            : await prisma.workspace.update({
                where: { id: workspaceId },
                data: { code, language: language || workspace.language },
            });

        // Prune old versions in background (don't block response)
        if (codeChanged) {
            void prisma.workspaceVersion.findMany({
                where: { workspaceId },
                orderBy: { savedAt: "desc" },
                skip: 5,
                select: { id: true },
            }).then((versions) => {
                if (versions.length > 0) {
                    return prisma.workspaceVersion.deleteMany({
                        where: { id: { in: versions.map((v) => v.id) } },
                    });
                }
            }).catch((err) => console.error("Version prune failed:", err));
        }

        return NextResponse.json({ success: true, workspace: updated });
    } catch (error) {
        console.error("Save workspace error:", error);
        return NextResponse.json(
            { error: "Error saving code" },
            { status: 500 }
        );
    }
}
