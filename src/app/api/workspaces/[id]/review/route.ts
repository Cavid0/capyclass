import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { validateTextInput } from "@/lib/utils";

// POST: Teacher reviews a workspace (CORRECT / INCORRECT)
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

        // Find workspace and verify user is classroom admin
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { classroom: { include: { admins: true } } },
        });

        if (!workspace) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const isAdmin =
            workspace.classroom.teacherId === userId ||
            workspace.classroom.admins.some((a) => a.userId === userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const { reviewStatus, reviewNote } = await req.json();

        if (!reviewStatus || !["CORRECT", "INCORRECT"].includes(reviewStatus)) {
            return NextResponse.json({ error: "Review status must be CORRECT or INCORRECT" }, { status: 400 });
        }

        let sanitizedReviewNote: string | null = null;
        if (reviewNote !== undefined && reviewNote !== null && reviewNote !== "") {
            const validatedReviewNote = validateTextInput(reviewNote, {
                fieldName: "Review note",
                maxLength: 1000,
                multiline: true,
            });
            if (!validatedReviewNote.ok) {
                return NextResponse.json({ error: validatedReviewNote.error }, { status: 400 });
            }
            sanitizedReviewNote = validatedReviewNote.value;
        }

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                reviewStatus,
                reviewNote: sanitizedReviewNote,
            },
        });

        await logAudit(userId, "WORKSPACE_REVIEWED", "Workspace", workspaceId, reviewStatus);

        return NextResponse.json({ success: true, workspace: updated });
    } catch (error) {
        console.error("Review workspace error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
