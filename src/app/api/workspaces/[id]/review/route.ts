import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Teacher reviews a workspace (CORRECT / INCORRECT)
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== "TEACHER") {
            return NextResponse.json({ error: "Yalnız müəllimlər review verə bilər" }, { status: 403 });
        }

        const userId = (session.user as any).id;
        const workspaceId = params.id;

        // Find workspace and verify teacher owns the classroom
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { classroom: true },
        });

        if (!workspace) {
            return NextResponse.json({ error: "Fayl tapılmadı" }, { status: 404 });
        }

        if (workspace.classroom.teacherId !== userId) {
            return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
        }

        const { reviewStatus, reviewNote } = await req.json();

        if (!reviewStatus || !["CORRECT", "INCORRECT"].includes(reviewStatus)) {
            return NextResponse.json({ error: "Review statusu CORRECT və ya INCORRECT olmalıdır" }, { status: 400 });
        }

        const updated = await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                reviewStatus,
                reviewNote: reviewNote?.trim() || null,
            },
        });

        return NextResponse.json({ success: true, workspace: updated });
    } catch (error) {
        console.error("Review workspace error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}
