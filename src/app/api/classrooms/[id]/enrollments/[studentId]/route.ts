import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string, studentId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const role = (session.user as any).role;
        const classroomId = params.id;
        const studentToRemove = params.studentId;

        if (role !== "TEACHER") {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId }
        });

        if (!classroom || classroom.teacherId !== userId) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Delete the student's workspaces in this classroom
        await prisma.workspace.deleteMany({
            where: { classroomId, studentId: studentToRemove }
        });

        // Delete the enrollment
        await prisma.enrollment.deleteMany({
            where: { classroomId, studentId: studentToRemove }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Remove student error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
