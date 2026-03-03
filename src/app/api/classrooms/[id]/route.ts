import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Get classroom details with students/workspaces
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const classroomId = params.id;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                teacher: { select: { name: true, email: true } },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isTeacher = classroom.teacherId === userId;

        if (isTeacher) {
            // Get all workspaces with student info
            const workspaces = await prisma.workspace.findMany({
                where: { classroomId },
                include: {
                    student: { select: { id: true, name: true, email: true } },
                },
                orderBy: { updatedAt: "desc" },
            });

            // Also get all enrolled students (some might not have workspaces yet)
            const enrollments = await prisma.enrollment.findMany({
                where: { classroomId },
                include: {
                    student: { select: { id: true, name: true, email: true } },
                },
            });

            return NextResponse.json({
                classroom: {
                    ...classroom,
                    teacherId: classroom.teacherId
                },
                workspaces,
                enrollments
            });
        } else {
            // Student: must be enrolled
            const enrollment = await prisma.enrollment.findUnique({
                where: {
                    studentId_classroomId: {
                        studentId: userId,
                        classroomId,
                    },
                },
            });

            if (!enrollment) {
                return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 403 });
            }

            // Return all student's workspaces in this classroom
            const workspaces = await prisma.workspace.findMany({
                where: {
                    studentId: userId,
                    classroomId,
                },
                orderBy: { updatedAt: "desc" },
            });

            return NextResponse.json({
                classroom: {
                    id: classroom.id,
                    name: classroom.name,
                    description: classroom.description,
                    teacherName: classroom.teacher.name,
                    teacherId: classroom.teacherId,
                },
                workspaces,
            });
        }
    } catch (error) {
        console.error("Get classroom error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const classroomId = params.id;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId }
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        if (classroom.teacherId !== userId) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Delete dependencies first
        await prisma.workspace.deleteMany({ where: { classroomId } });
        await prisma.enrollment.deleteMany({ where: { classroomId } });
        await prisma.task.deleteMany({ where: { classroomId } });

        // Delete classroom
        await prisma.classroom.delete({ where: { id: classroomId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete classroom error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
