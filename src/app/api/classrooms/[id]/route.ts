import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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

        const userId = session.user.id;
        const classroomId = params.id;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                teacher: { select: { id: true, name: true } },
                admins: { include: { user: { select: { id: true, name: true } } } },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isTeacher =
            classroom.teacherId === userId ||
            classroom.admins.some((a) => a.userId === userId);

        if (isTeacher) {
            // Support optional pagination via query params
            const { searchParams } = new URL(req.url);
            const cursor = searchParams.get("cursor");
            const limit = Math.min(parseInt(searchParams.get("limit") || "50") || 50, 100);

            // Get all workspaces with student info (paginated)
            const workspaces = await prisma.workspace.findMany({
                where: { classroomId },
                include: {
                    student: { select: { id: true, name: true, email: true } },
                },
                orderBy: { updatedAt: "desc" },
                take: limit + 1,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });

            const hasMore = workspaces.length > limit;
            if (hasMore) workspaces.pop();
            const nextCursor = hasMore ? workspaces[workspaces.length - 1]?.id : null;

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
                enrollments,
                admins: classroom.admins,
                nextCursor,
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

            // Get enrollment count for student
            const enrollmentCount = await prisma.enrollment.count({
                where: { classroomId },
            });

            return NextResponse.json({
                classroom: {
                    id: classroom.id,
                    name: classroom.name,
                    description: classroom.description,
                    teacherName: classroom.teacher.name,
                    teacherId: classroom.teacherId,
                    memberCount: enrollmentCount,
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

        const userId = session.user.id;
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

        // Delete all related data in a single transaction
        await prisma.$transaction([
            prisma.workspace.deleteMany({ where: { classroomId } }),
            prisma.task.deleteMany({ where: { classroomId } }),
            prisma.enrollment.deleteMany({ where: { classroomId } }),
            prisma.classroomAdmin.deleteMany({ where: { classroomId } }),
            prisma.classroom.delete({ where: { id: classroomId } }),
        ]);

        await logAudit(userId, "CLASSROOM_DELETED", "Classroom", classroomId, classroom.name);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete classroom error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
