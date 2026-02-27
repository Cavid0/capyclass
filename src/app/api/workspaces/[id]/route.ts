import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = params;

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: { student: true, classroom: true }
        });

        if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });

        // Let teacher delete any workspace in their class, or student delete their own workspace
        if (!user || (user.id !== workspace.studentId && user.id !== workspace.classroom.teacherId)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.workspace.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting workspace:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
