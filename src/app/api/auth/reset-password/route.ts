import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!rateLimit(`reset-pwd:${ip}`, 10, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json(
                { error: "Email, code, and new password are required" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check lockout
        if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
            return NextResponse.json(
                { error: "Too many failed attempts. Please try again later." },
                { status: 429 }
            );
        }

        // Check expiry
        if (!user.verificationToken || !user.verificationTokenExpiresAt || new Date() > user.verificationTokenExpiresAt) {
            return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
        }

        // Check purpose
        if (user.tokenPurpose !== "PASSWORD_RESET") {
            return NextResponse.json({ error: "Invalid code for this action." }, { status: 400 });
        }

        if (user.verificationToken !== code) {
            const newAttempts = (user.otpAttempts || 0) + 1;
            const updateData: any = { otpAttempts: newAttempts };
            if (newAttempts >= 5) {
                updateData.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
                updateData.verificationToken = null;
                updateData.tokenPurpose = null;
                updateData.verificationTokenExpiresAt = null;
            }
            await prisma.user.update({ where: { id: user.id }, data: updateData });

            return NextResponse.json({
                error: newAttempts >= 5
                    ? "Too many failed attempts. Please request a new code."
                    : `Invalid code. ${5 - newAttempts} attempts remaining.`
            }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                verificationToken: null,
                tokenPurpose: null,
                verificationTokenExpiresAt: null,
                otpAttempts: 0,
                otpLockedUntil: null,
            },
        });

        return NextResponse.json({ message: "Password changed successfully! You can now log in." });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
