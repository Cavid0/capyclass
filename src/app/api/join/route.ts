import { NextResponse } from "next/server";

// Deprecated — classroom joining is handled by /api/classrooms/[inviteCode]/join
export async function POST() {
    return NextResponse.json({ error: "Use /api/classrooms/[inviteCode]/join" }, { status: 410 });
}

