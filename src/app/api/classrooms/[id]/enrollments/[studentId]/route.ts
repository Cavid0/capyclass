import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string, studentId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const classroomId = params.id;
        const studentToRemove = params.studentId;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { admins: true },
        });

        const isAdmin =
            classroom?.teacherId === userId ||
            classroom?.admins.some((a) => a.userId === userId);

        if (!classroom || !isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Delete the student's workspaces and enrollment atomically
        await prisma.$transaction([
            prisma.workspace.deleteMany({ where: { classroomId, studentId: studentToRemove } }),
            prisma.enrollment.deleteMany({ where: { classroomId, studentId: studentToRemove } }),
        ]);

        logAudit(userId, "STUDENT_REMOVED", "Classroom", classroomId, studentToRemove);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Remove student error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
