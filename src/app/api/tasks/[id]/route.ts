import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { validateTextInput } from "@/lib/utils";

async function getAdminAccess(userId: string, taskId: string) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { classroom: { include: { admins: true } } },
    });
    if (!task) return { task: null, authorized: false };
    const isOwner = userId === task.classroom.teacherId;
    const isAdmin = task.classroom.admins.some((a) => a.userId === userId);
    return { task, authorized: isOwner || isAdmin };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { id } = params;
        const { title, description, dueDate } = await req.json();

        const { task, authorized } = await getAdminAccess(userId, id);
        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        // Validate dueDate if provided
        let parsedDueDate: Date | null | undefined = undefined;
        if (dueDate !== undefined) {
            parsedDueDate = dueDate ? new Date(dueDate) : null;
            if (dueDate && isNaN(parsedDueDate!.getTime())) {
                return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
            }
        }

        const updateData: any = {};
        if (title !== undefined) {
            const validatedTitle = validateTextInput(title, { fieldName: "Task title", maxLength: 200 });
            if (!validatedTitle.ok) return NextResponse.json({ error: validatedTitle.error }, { status: 400 });
            updateData.title = validatedTitle.value;
        }
        if (description !== undefined) {
            if (description === null || description === "") {
                updateData.description = "";
            } else {
                const validatedDescription = validateTextInput(description, {
                    fieldName: "Task description",
                    maxLength: 5000,
                    multiline: true,
                });
                if (!validatedDescription.ok) return NextResponse.json({ error: validatedDescription.error }, { status: 400 });
                updateData.description = validatedDescription.value;
            }
        }
        if (parsedDueDate !== undefined) updateData.dueDate = parsedDueDate;

        const updatedTask = await prisma.task.update({
            where: { id },
            data: updateData,
        });

        logAudit(userId, "TASK_UPDATED", "Task", id, title);

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const { id } = params;

        const { task, authorized } = await getAdminAccess(userId, id);
        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        await prisma.task.delete({ where: { id } });
        logAudit(userId, "TASK_DELETED", "Task", id, task.title);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
