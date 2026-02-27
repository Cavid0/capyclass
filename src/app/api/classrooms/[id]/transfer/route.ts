import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const classroomId = params.id;
        const currentUserId = (session.user as any).id;
        const { newTeacherId } = await req.json();

        if (!newTeacherId) {
            return NextResponse.json({ error: "Yeni admin ID tələb olunur" }, { status: 400 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { enrollments: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Sinif tapılmadı" }, { status: 404 });
        }

        if (classroom.teacherId !== currentUserId) {
            return NextResponse.json(
                { error: "Yalnız sinfin mövcud admini hüquqları köçürə bilər" },
                { status: 403 }
            );
        }

        // Check if the new teacher is actually a student in this class
        const isStudentEnrolled = classroom.enrollments.some(e => e.studentId === newTeacherId);
        if (!isStudentEnrolled) {
            return NextResponse.json(
                { error: "Yeni admin sinfə daxil olan tələbə olmalıdır" },
                { status: 400 }
            );
        }

        // Perform in a transaction:
        // 1. Update classroom's teacherId to newTeacherId
        // 2. Add currentUserId as an Enrollment (so they become a student)
        // 3. Remove newTeacherId from Enrollments (since they are now the teacher)
        await prisma.$transaction([
            prisma.classroom.update({
                where: { id: classroomId },
                data: { teacherId: newTeacherId },
            }),
            prisma.enrollment.create({
                data: {
                    classroomId,
                    studentId: currentUserId,
                },
            }),
            prisma.enrollment.deleteMany({
                where: {
                    classroomId,
                    studentId: newTeacherId,
                },
            }),
        ]);

        return NextResponse.json({ message: "Admin hüquqları uğurla köçürüldü" });
    } catch (error) {
        console.error("Transfer teacher error:", error);
        return NextResponse.json(
            { error: "Hüquqlar köçürülərkən xəta baş verdi" },
            { status: 500 }
        );
    }
}
