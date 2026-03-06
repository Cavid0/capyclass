import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = params;
        const body = await req.json();
        const { title, description } = body;

        // Verify task exists and caller is teacher or co-admin
        const task = await prisma.task.findUnique({
            where: { id },
            include: { classroom: { include: { admins: true } } }
        });

        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        const isOwner = user?.id === task.classroom.teacherId;
        const isAdmin = task.classroom.admins.some((a: any) => a.userId === user?.id);
        if (!user || (!isOwner && !isAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { title, description }
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error("Error updating task:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = params;

        const task = await prisma.task.findUnique({
            where: { id },
            include: { classroom: { include: { admins: true } } }
        });

        if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        const isOwner = user?.id === task.classroom.teacherId;
        const isAdmin = task.classroom.admins.some((a: any) => a.userId === user?.id);
        if (!user || (!isOwner && !isAdmin)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.task.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
