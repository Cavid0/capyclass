import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isCleanText } from "@/lib/utils";

// GET: List tasks for a classroom
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

        // Verify access
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        // Check access: owner, co-admin, or enrolled student
        const isOwner = classroom.teacherId === userId;
        const isAdmin = !isOwner && await prisma.classroomAdmin.findUnique({
            where: { classroomId_userId: { classroomId, userId } },
        });

        if (!isOwner && !isAdmin) {
            const enrollment = await prisma.enrollment.findUnique({
                where: { studentId_classroomId: { studentId: userId, classroomId } },
            });
            if (!enrollment) {
                return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 403 });
            }
        }

        const tasks = await prisma.task.findMany({
            where: { classroomId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("List tasks error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

// POST: Create a task (teacher only)
export async function POST(
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

        // Verify ownership or co-admin
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isOwner = classroom.teacherId === userId;
        const isAdmin = !isOwner && await prisma.classroomAdmin.findUnique({
            where: { classroomId_userId: { classroomId, userId } },
        });

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Only teachers and admins can create tasks" }, { status: 403 });
        }

        const { title, description, dueDate } = await req.json();

        if (!title?.trim()) {
            return NextResponse.json({ error: "Task title is required" }, { status: 400 });
        }
        if (title.length > 200 || !isCleanText(title)) {
            return NextResponse.json({ error: "Invalid task title" }, { status: 400 });
        }
        if (description && (description.length > 5000 || !isCleanText(description))) {
            return NextResponse.json({ error: "Invalid task description" }, { status: 400 });
        }

        // Validate dueDate if provided
        let parsedDueDate: Date | null = null;
        if (dueDate) {
            parsedDueDate = new Date(dueDate);
            if (isNaN(parsedDueDate.getTime())) {
                return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
            }
        }

        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                description: description?.trim() || "",
                classroomId,
                dueDate: parsedDueDate,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Create task error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
