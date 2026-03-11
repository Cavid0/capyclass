import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail, normalizeOtpCode } from "@/lib/utils";

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
        const normalizedEmail = typeof email === "string" && email.trim() ? normalizeEmail(email) : "";
        const normalizedCode = typeof code === "string" ? normalizeOtpCode(code) : "";

        if (!normalizedCode) {
            return NextResponse.json(
                { error: "Verification code is required" },
                { status: 400 }
            );
        }

        if (normalizedEmail && !isValidEmail(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        let user;
        if (normalizedEmail) {
            user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        } else {
            user = await prisma.user.findFirst({ where: { verificationToken: normalizedCode } });
        }

        if (!user) {
            return NextResponse.json(
                { error: "Invalid or expired verification link" },
                { status: 404 }
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

        if (user.verificationToken !== normalizedCode) {
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
        return NextResponse.json(
            { error: error?.message || "An error occurred" },
            { status: 500 }
        );
    }
}
