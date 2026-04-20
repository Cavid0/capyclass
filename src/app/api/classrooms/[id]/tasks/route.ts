import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateTextInput } from "@/lib/utils";

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

        // Run permission checks and task fetch in parallel
        const [classroom, adminRecord, enrollment, tasks] = await Promise.all([
            prisma.classroom.findUnique({
                where: { id: classroomId },
                select: { teacherId: true },
            }),
            prisma.classroomAdmin.findUnique({
                where: { classroomId_userId: { classroomId, userId } },
            }),
            prisma.enrollment.findUnique({
                where: { studentId_classroomId: { studentId: userId, classroomId } },
            }),
            prisma.task.findMany({
                where: { classroomId },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const hasAccess = classroom.teacherId === userId || adminRecord || enrollment;
        if (!hasAccess) {
            return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 403 });
        }

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

        const validatedTitle = validateTextInput(title, { fieldName: "Task title", maxLength: 200 });
        if (!validatedTitle.ok) {
            return NextResponse.json({ error: validatedTitle.error }, { status: 400 });
        }

        let validatedDescription = "";
        if (description !== undefined && description !== null && description !== "") {
            const descriptionResult = validateTextInput(description, {
                fieldName: "Task description",
                maxLength: 5000,
                multiline: true,
            });
            if (!descriptionResult.ok) {
                return NextResponse.json({ error: descriptionResult.error }, { status: 400 });
            }
            validatedDescription = descriptionResult.value;
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
                title: validatedTitle.value,
                description: validatedDescription,
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
