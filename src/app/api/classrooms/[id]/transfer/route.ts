import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Add a co-admin to the classroom (owner keeps their status)
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
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { enrollments: true, admins: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isOwner =
            classroom.teacherId === currentUserId ||
            classroom.admins.some((a) => a.userId === currentUserId);

        if (!isOwner) {
            return NextResponse.json(
                { error: "Only admins can grant admin rights" },
                { status: 403 }
            );
        }

        // Target must be an enrolled student
        const isEnrolled = classroom.enrollments.some(e => e.studentId === newTeacherId);
        if (!isEnrolled) {
            return NextResponse.json(
                { error: "User must be an enrolled student" },
                { status: 400 }
            );
        }

        // Add as co-admin (upsert to avoid duplicate)
        await prisma.classroomAdmin.upsert({
            where: { classroomId_userId: { classroomId, userId: newTeacherId } },
            create: { classroomId, userId: newTeacherId },
            update: {},
        });

        return NextResponse.json({ message: "Admin rights granted successfully" });
    } catch (error) {
        console.error("Add admin error:", error);
        return NextResponse.json(
            { error: "Error granting admin rights" },
            { status: 500 }
        );
    }
}

// DELETE: Remove a co-admin
export async function DELETE(
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
        const { adminId } = await req.json();

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        // Only owner can remove admins
        if (classroom.teacherId !== currentUserId) {
            return NextResponse.json({ error: "Only the owner can remove admins" }, { status: 403 });
        }

        await prisma.classroomAdmin.deleteMany({
            where: { classroomId, userId: adminId },
        });

        return NextResponse.json({ message: "Admin rights revoked" });
    } catch (error) {
        console.error("Remove admin error:", error);
        return NextResponse.json(
            { error: "Error revoking admin rights" },
            { status: 500 }
        );
    }
}
