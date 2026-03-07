import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode, isCleanText } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

// GET: List classrooms for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;

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

        // Batch query: get status counts for ALL teaching classrooms at once (fixes N+1)
        const classroomIds = teachingClassrooms.map((c) => c.id);
        const allStatusCounts = classroomIds.length > 0
            ? await prisma.workspace.groupBy({
                by: ["classroomId", "status"],
                where: { classroomId: { in: classroomIds } },
                _count: true,
            })
            : [];

        // Build a lookup map: classroomId -> { PASS: n, FAIL: n, PENDING: n }
        const statsMap = new Map<string, { PASS: number; FAIL: number; PENDING: number }>();
        for (const row of allStatusCounts) {
            if (!statsMap.has(row.classroomId)) {
                statsMap.set(row.classroomId, { PASS: 0, FAIL: 0, PENDING: 0 });
            }
            const entry = statsMap.get(row.classroomId)!;
            entry[row.status] = row._count;
        }

        const teachingWithStats = teachingClassrooms.map((c) => {
            const stats = statsMap.get(c.id) || { PASS: 0, FAIL: 0, PENDING: 0 };
            return {
                ...c,
                isTeacher: true,
                passCount: stats.PASS,
                failCount: stats.FAIL,
                pendingCount: stats.PENDING,
            };
        });

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

        allClasses.sort((a: any, b: any) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return NextResponse.json(allClasses);
    } catch (error) {
        console.error("List classrooms error:", error);
        return NextResponse.json(
            { error: "An error occurred" },
            { status: 500 }
        );
    }
}

// POST: Create a new classroom (teacher only)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;

        // Rate limit: 10 classrooms per hour
        if (!rateLimit(`create-class:${userId}`, 10, 60 * 60 * 1000)) {
            return NextResponse.json({ error: "Too many classrooms created. Please wait." }, { status: 429 });
        }

        const { name, description } = await req.json();
        if (!name) {
            return NextResponse.json(
                { error: "Classroom name is required" },
                { status: 400 }
            );
        }
        if (name.length > 100 || !isCleanText(name)) {
            return NextResponse.json({ error: "Invalid classroom name" }, { status: 400 });
        }

        const classroom = await prisma.classroom.create({
            data: {
                name,
                description: description || null,
                inviteCode: generateInviteCode(),
                teacherId: userId,
            },
        });

        return NextResponse.json(classroom, { status: 201 });
    } catch (error) {
        console.error("Create classroom error:", error);
        return NextResponse.json(
            { error: "Error creating classroom" },
            { status: 500 }
        );
    }
}
