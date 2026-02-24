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
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const role = (session.user as any).role;
        const classroomId = params.id;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: {
                teacher: { select: { name: true, email: true } },
            },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Sinif tapılmadı" }, { status: 404 });
        }

        if (role === "TEACHER") {
            // Teacher: must own the classroom
            if (classroom.teacherId !== userId) {
                return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
            }

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

            return NextResponse.json({ classroom, workspaces, enrollments });
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
                return NextResponse.json({ error: "Bu sinifə qoşulmamısınız" }, { status: 403 });
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
                },
                workspaces,
            });
        }
    } catch (error) {
        console.error("Get classroom error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}
