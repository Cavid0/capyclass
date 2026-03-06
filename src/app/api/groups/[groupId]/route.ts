import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE: Remove a group (admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { groupId } = params;

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { classroom: { include: { admins: true } } },
        });

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const isAdmin =
            group.classroom.teacherId === userId ||
            group.classroom.admins.some((a) => a.userId === userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Only admins can delete groups" }, { status: 403 });
        }

        await prisma.groupEnrollment.deleteMany({ where: { groupId } });
        await prisma.group.delete({ where: { id: groupId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete group error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

// PATCH: Rename/update a group (admin only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { groupId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { groupId } = params;

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { classroom: { include: { admins: true } } },
        });

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const isAdmin =
            group.classroom.teacherId === userId ||
            group.classroom.admins.some((a) => a.userId === userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Only admins can edit groups" }, { status: 403 });
        }

        const { name, description } = await req.json();

        const updated = await prisma.group.update({
            where: { id: groupId },
            data: {
                name: name?.trim() || group.name,
                description: description?.trim() ?? group.description,
            },
            include: { _count: { select: { enrollments: true } } },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update group error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
