import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List notifications for current user
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get("unread") === "true";
        const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 50);
        const cursor = searchParams.get("cursor");

        const notifications = await prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = notifications.length > limit;
        if (hasMore) notifications.pop();

        const unreadCount = await prisma.notification.count({
            where: { userId, read: false },
        });

        return NextResponse.json({
            notifications,
            unreadCount,
            nextCursor: hasMore ? notifications[notifications.length - 1]?.id : null,
        });
    } catch (error) {
        console.error("List notifications error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

// PUT: Mark notifications as read
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const { ids } = await req.json();

        if (ids && Array.isArray(ids)) {
            // Mark specific notifications as read
            await prisma.notification.updateMany({
                where: { id: { in: ids }, userId },
                data: { read: true },
            });
        } else {
            // Mark all as read
            await prisma.notification.updateMany({
                where: { userId, read: false },
                data: { read: true },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mark notifications error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
