import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/utils";

// GET: List groups in a classroom (with member counts)
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
            include: { admins: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isAdmin =
            classroom.teacherId === userId ||
            classroom.admins.some((a) => a.userId === userId);

        const isEnrolled = await prisma.enrollment.findUnique({
            where: { studentId_classroomId: { studentId: userId, classroomId } },
        });

        if (!isAdmin && !isEnrolled) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const groups = await prisma.group.findMany({
            where: { classroomId },
            include: {
                _count: { select: { enrollments: true } },
                enrollments: {
                    include: {
                        student: { select: { id: true, name: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("List groups error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

// POST: Create a new group inside a classroom (admin only)
export async function POST(
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
            include: { admins: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isAdmin =
            classroom.teacherId === userId ||
            classroom.admins.some((a) => a.userId === userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Only admins can create groups" }, { status: 403 });
        }

        const { name, description } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Group name is required" }, { status: 400 });
        }

        const group = await prisma.group.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                inviteCode: generateInviteCode(),
                classroomId,
            },
            include: {
                _count: { select: { enrollments: true } },
            },
        });

        return NextResponse.json(group, { status: 201 });
    } catch (error) {
        console.error("Create group error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
