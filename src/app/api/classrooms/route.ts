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
        const role = (session.user as any).role;

        if (role === "TEACHER") {
            const classrooms = await prisma.classroom.findMany({
                where: { teacherId: userId },
                include: {
                    _count: {
                        select: { enrollments: true, workspaces: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            });

            // Get status counts for each classroom
            const classroomsWithStats = await Promise.all(
                classrooms.map(async (c) => {
                    const statusCounts = await prisma.workspace.groupBy({
                        by: ["status"],
                        where: { classroomId: c.id },
                        _count: true,
                    });
                    return {
                        ...c,
                        passCount: statusCounts.find((s) => s.status === "PASS")?._count || 0,
                        failCount: statusCounts.find((s) => s.status === "FAIL")?._count || 0,
                        pendingCount: statusCounts.find((s) => s.status === "PENDING")?._count || 0,
                    };
                })
            );

            return NextResponse.json(classroomsWithStats);
        } else {
            // Student: return enrolled classrooms
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

            return NextResponse.json(
                enrollments.map((e) => ({
                    ...e.classroom,
                    teacherName: e.classroom.teacher.name,
                }))
            );
        }
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

        const role = (session.user as any).role;
        if (role !== "TEACHER") {
            return NextResponse.json(
                { error: "Yalnız müəllimlər sinif yarada bilər" },
                { status: 403 }
            );
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
