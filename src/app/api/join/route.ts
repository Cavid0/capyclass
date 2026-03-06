import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/join
 * Body: { code: string }
 * Resolves an invite code – could be a classroom invite or a group invite.
 * Returns { type: "classroom"|"group", classroomId, groupId? }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { code } = await req.json();

        if (!code?.trim()) {
            return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
        }

        // 1. Try classroom invite code first
        const classroom = await prisma.classroom.findUnique({
            where: { inviteCode: code.trim() },
        });

        if (classroom) {
            // Check if already enrolled
            const existing = await prisma.enrollment.findUnique({
                where: { studentId_classroomId: { studentId: userId, classroomId: classroom.id } },
            });

            if (!existing) {
                await prisma.$transaction([
                    prisma.enrollment.create({ data: { studentId: userId, classroomId: classroom.id } }),
                    prisma.workspace.create({
                        data: {
                            studentId: userId,
                            classroomId: classroom.id,
                            title: "Main file",
                            code: "",
                            language: "javascript",
                        },
                    }),
                ]);
            }

            return NextResponse.json({ type: "classroom", classroomId: classroom.id });
        }

        // 2. Try group invite code
        const group = await prisma.group.findUnique({
            where: { inviteCode: code.trim() },
            include: { classroom: true },
        });

        if (group) {
            const classroomId = group.classroomId;

            // Enroll in parent classroom if not already
            const existingEnrollment = await prisma.enrollment.findUnique({
                where: { studentId_classroomId: { studentId: userId, classroomId } },
            });

            const ops: any[] = [];

            if (!existingEnrollment) {
                ops.push(
                    prisma.enrollment.create({ data: { studentId: userId, classroomId } }),
                    prisma.workspace.create({
                        data: {
                            studentId: userId,
                            classroomId,
                            title: "Main file",
                            code: "",
                            language: "javascript",
                        },
                    })
                );
            }

            // Enroll in group if not already
            const existingGroupEnrollment = await prisma.groupEnrollment.findUnique({
                where: { studentId_groupId: { studentId: userId, groupId: group.id } },
            });

            if (!existingGroupEnrollment) {
                ops.push(
                    prisma.groupEnrollment.create({ data: { studentId: userId, groupId: group.id } })
                );
            }

            if (ops.length > 0) {
                await prisma.$transaction(ops);
            }

            return NextResponse.json({ type: "group", classroomId, groupId: group.id });
        }

        return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    } catch (error) {
        console.error("Join error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
