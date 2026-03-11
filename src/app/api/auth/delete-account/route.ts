import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeOtpCode, verifyOtpToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;

        if (!rateLimit(`delete:${userId}`, 3, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 15 minutes." },
                { status: 429 }
            );
        }
        const { otp } = await req.json();
        const normalizedOtp = typeof otp === "string" ? normalizeOtpCode(otp) : "";

        if (!/^\d{6}$/.test(normalizedOtp)) {
            return NextResponse.json({ error: "OTP code is required" }, { status: 400 });
        }

        // Verify OTP with purpose and brute-force protection
        const otpResult = await verifyOtpToken(userId, normalizedOtp, "ACCOUNT_DELETE");
        if (!otpResult.valid) {
            return NextResponse.json({ error: otpResult.error }, { status: 400 });
        }

        // If teacher owns classrooms, delete them first
        const ownedClassrooms = await prisma.classroom.findMany({
            where: { teacherId: userId },
            select: { id: true },
        });

        const classroomIds = ownedClassrooms.map((c) => c.id);

        // Delete all related data in a transaction
        await prisma.$transaction(async (tx) => {
            if (classroomIds.length > 0) {
                await tx.workspace.deleteMany({ where: { classroomId: { in: classroomIds } } });
                await tx.task.deleteMany({ where: { classroomId: { in: classroomIds } } });
                await tx.enrollment.deleteMany({ where: { classroomId: { in: classroomIds } } });
                await tx.classroomAdmin.deleteMany({ where: { classroomId: { in: classroomIds } } });
                await tx.classroom.deleteMany({ where: { teacherId: userId } });
            }

            await tx.classroomAdmin.deleteMany({ where: { userId } });
            await tx.auditLog.deleteMany({ where: { userId } });
            await tx.workspace.deleteMany({ where: { studentId: userId } });
            await tx.enrollment.deleteMany({ where: { studentId: userId } });
            await tx.user.delete({ where: { id: userId } });
        });

        return NextResponse.json({ message: "Account deleted successfully" });
    } catch (error: any) {
        console.error("Delete account error:", error);
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
