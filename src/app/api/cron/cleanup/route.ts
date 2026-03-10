import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Cleanup old audit logs and workspace versions
// Protected by a secret key — call from cron service
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();

        // Delete audit logs older than 30 days
        const logCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const deletedLogs = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: logCutoff } },
        });

        return NextResponse.json({
            success: true,
            deletedLogs: deletedLogs.count,
        });
    } catch (error) {
        console.error("Cleanup cron error:", error);
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}

