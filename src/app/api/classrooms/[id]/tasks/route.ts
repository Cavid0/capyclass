import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List tasks for a classroom
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
        const classroomId = params.id;

        // Verify access
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Sinif tapılmadı" }, { status: 404 });
        }

        const role = (session.user as any).role;
        if (role === "TEACHER" && classroom.teacherId !== userId) {
            return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
        }

        if (role === "STUDENT") {
            const enrollment = await prisma.enrollment.findUnique({
                where: { studentId_classroomId: { studentId: userId, classroomId } },
            });
            if (!enrollment) {
                return NextResponse.json({ error: "Bu sinifə qoşulmamısınız" }, { status: 403 });
            }
        }

        const tasks = await prisma.task.findMany({
            where: { classroomId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("List tasks error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
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
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const role = (session.user as any).role;
        if (role !== "TEACHER") {
            return NextResponse.json({ error: "Yalnız müəllimlər tapşırıq yarada bilər" }, { status: 403 });
        }

        const userId = (session.user as any).id;
        const classroomId = params.id;

        // Verify ownership
        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
        });

        if (!classroom || classroom.teacherId !== userId) {
            return NextResponse.json({ error: "İcazə yoxdur" }, { status: 403 });
        }

        const { title, description } = await req.json();

        if (!title?.trim()) {
            return NextResponse.json({ error: "Tapşırıq başlığı tələb olunur" }, { status: 400 });
        }

        const task = await prisma.task.create({
            data: {
                title: title.trim(),
                description: description?.trim() || "",
                classroomId,
            },
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error("Create task error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}
