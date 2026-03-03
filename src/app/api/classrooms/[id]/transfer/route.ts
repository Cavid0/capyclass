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
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const classroomId = params.id;
        const currentUserId = (session.user as any).id;
        const { newTeacherId } = await req.json();

        if (!newTeacherId) {
            return NextResponse.json({ error: "New admin ID is required" }, { status: 400 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { enrollments: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        if (classroom.teacherId !== currentUserId) {
            return NextResponse.json(
                { error: "Only the current admin can transfer rights" },
                { status: 403 }
            );
        }

        // Check if the new teacher is actually a student in this class
        const isStudentEnrolled = classroom.enrollments.some(e => e.studentId === newTeacherId);
        if (!isStudentEnrolled) {
            return NextResponse.json(
                { error: "New admin must be an enrolled student" },
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

        return NextResponse.json({ message: "Admin rights transferred successfully" });
    } catch (error) {
        console.error("Transfer teacher error:", error);
        return NextResponse.json(
            { error: "Error transferring rights" },
            { status: 500 }
        );
    }
}
