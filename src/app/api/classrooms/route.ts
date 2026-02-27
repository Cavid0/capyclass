import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";

// GET: List classrooms for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // Fetch classrooms created by the user (teacher role for these)
        const teachingClassrooms = await prisma.classroom.findMany({
            where: { teacherId: userId },
            include: {
                _count: {
                    select: { enrollments: true, workspaces: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Get status counts for teaching classrooms
        const teachingWithStats = await Promise.all(
            teachingClassrooms.map(async (c) => {
                const statusCounts = await prisma.workspace.groupBy({
                    by: ["status"],
                    where: { classroomId: c.id },
                    _count: true,
                });
                return {
                    ...c,
                    isTeacher: true,
                    passCount: statusCounts.find((s) => s.status === "PASS")?._count || 0,
                    failCount: statusCounts.find((s) => s.status === "FAIL")?._count || 0,
                    pendingCount: statusCounts.find((s) => s.status === "PENDING")?._count || 0,
                };
            })
        );

        // Fetch classrooms enrolled by the user (student role for these)
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: userId },
            include: {
                classroom: {
                    include: {
                        teacher: { select: { name: true } },
                    },
                },
            },
            orderBy: { joinedAt: "desc" },
        });

        const enrolledClassrooms = enrollments.map((e) => ({
            ...e.classroom,
            isTeacher: false,
            teacherName: e.classroom.teacher.name,
        }));

        const allClasses = [...teachingWithStats, ...enrolledClassrooms];

        // Sort by most recently created/joined
        allClasses.sort((a: any, b: any) => {
            const dateA = a.isTeacher ? a.createdAt : a.createdAt; // or joinedAt if available
            const dateB = b.isTeacher ? b.createdAt : b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return NextResponse.json(allClasses);
    } catch (error) {
        console.error("List classrooms error:", error);
        return NextResponse.json(
            { error: "Xəta baş verdi" },
            { status: 500 }
        );
    }
}

// POST: Create a new classroom (teacher only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const { name, description } = await req.json();
        if (!name) {
            return NextResponse.json(
                { error: "Sinif adı tələb olunur" },
                { status: 400 }
            );
        }

        const classroom = await prisma.classroom.create({
            data: {
                name,
                description: description || null,
                inviteCode: generateInviteCode(),
                teacherId: (session.user as any).id,
            },
        });

        return NextResponse.json(classroom, { status: 201 });
    } catch (error) {
        console.error("Create classroom error:", error);
        return NextResponse.json(
            { error: "Sinif yaradılarkən xəta baş verdi" },
            { status: 500 }
        );
    }
}
