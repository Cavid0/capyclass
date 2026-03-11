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

        const userId = session.user.id;
        const classroomId = params.id;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_classroomId: {
                    studentId: userId,
                    classroomId,
                },
            },
        });

        if (!enrollment) {
            return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 404 });
        }

        await prisma.workspace.deleteMany({
            where: {
                studentId: userId,
                classroomId,
            },
        });

        await prisma.enrollment.delete({
            where: {
                studentId_classroomId: {
                    studentId: userId,
                    classroomId,
                },
            },
        });

        return NextResponse.json({ message: "Successfully left the classroom" });
    } catch (error) {
        console.error("Leave classroom error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
