import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail, normalizeOtpCode } from "@/lib/utils";

function constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
    try {
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        if (!rateLimit(`verify-email:${ip}`, 10, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        const { email, code } = await req.json();
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";
        const normalizedCode = typeof code === "string" ? normalizeOtpCode(code) : "";

        if (!normalizedEmail || !normalizedCode) {
            return NextResponse.json(
                { error: "Email and verification code are required" },
                { status: 400 }
            );
        }

        if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(normalizedCode)) {
            return NextResponse.json({ error: "Invalid email or code format" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid or expired verification code" },
                { status: 400 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: "Email is already verified" });
        }

        // Check lockout
        if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
            return NextResponse.json(
                { error: "Too many failed attempts. Please try again later." },
                { status: 429 }
            );
        }

        // Check token expiry
        if (!user.verificationToken || !user.verificationTokenExpiresAt || new Date() > user.verificationTokenExpiresAt) {
            return NextResponse.json(
                { error: "Code has expired. Please request a new one." },
                { status: 400 }
            );
        }

        // Check purpose
        if (user.tokenPurpose !== "EMAIL_VERIFY") {
            return NextResponse.json(
                { error: "Invalid code for this action." },
                { status: 400 }
            );
        }

        if (!constantTimeEqual(user.verificationToken, normalizedCode)) {
            // Increment attempts
            const newAttempts = (user.otpAttempts || 0) + 1;
            const updateData: any = { otpAttempts: newAttempts };
            if (newAttempts >= 5) {
                updateData.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                updateData.verificationToken = null;
                updateData.tokenPurpose = null;
                updateData.verificationTokenExpiresAt = null;
            }
            await prisma.user.update({ where: { id: user.id }, data: updateData });

            return NextResponse.json(
                { error: newAttempts >= 5 ? "Too many failed attempts. Account locked for 15 minutes." : `Invalid code. ${5 - newAttempts} attempts remaining.` },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                tokenPurpose: null,
                verificationTokenExpiresAt: null,
                otpAttempts: 0,
                otpLockedUntil: null,
            },
        });

        return NextResponse.json({ message: "Email verified successfully! You can now log in." });
    } catch (error: any) {
        console.error("Verify email error:", error?.message);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
