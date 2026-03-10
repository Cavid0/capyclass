import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        return NextResponse.json({
            notifications: [],
            unreadCount: 0,
            nextCursor: null,
        });
    } catch (error) {
        console.error("List notifications error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Mark notifications error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

