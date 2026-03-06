import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Student joins a classroom via invite code
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
        const role = (session.user as any).role;

        if (role !== "STUDENT") {
            return NextResponse.json(
                { error: "Only students can join a classroom" },
                { status: 403 }
            );
        }

        const classroom = await prisma.classroom.findUnique({
            where: { inviteCode: params.id },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_classroomId: {
                    studentId: userId,
                    classroomId: classroom.id,
                },
            },
        });

        if (existingEnrollment) {
            return NextResponse.json({
                message: "You are already enrolled in this classroom",
                classroomId: classroom.id,
            });
        }

        // Create enrollment and workspace in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const enrollment = await tx.enrollment.create({
                data: {
                    studentId: userId,
                    classroomId: classroom.id,
                },
            });

            const workspace = await tx.workspace.create({
                data: {
                    studentId: userId,
                    classroomId: classroom.id,
                    title: "Main file",
                    code: 'console.log("Hello, World!");',
                    language: "javascript",
                },
            });

            return { enrollment, workspace };
        });

        return NextResponse.json(
            {
                message: "Successfully joined the classroom!",
                classroomId: classroom.id,
                workspaceId: result.workspace.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Join classroom error:", error);
        return NextResponse.json(
            { error: "Error joining classroom" },
            { status: 500 }
        );
    }
}


