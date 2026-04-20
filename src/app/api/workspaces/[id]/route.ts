import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { id } = params;

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: { classroom: { include: { admins: true } } }
        });

        if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

        const isOwner = userId === workspace.classroom.teacherId;
        const isAdmin = workspace.classroom.admins.some((a) => a.userId === userId);
        if (userId !== workspace.studentId && !isOwner && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await prisma.workspace.delete({ where: { id } });
        logAudit(userId, "WORKSPACE_DELETED", "Workspace", id, workspace.title);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting workspace:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
