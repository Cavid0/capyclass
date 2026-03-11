import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail, normalizeOtpCode, validatePasswordStrength, verifyOtpToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        if (!rateLimit(`reset-pwd:${ip}`, 10, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        const { email, code, newPassword } = await req.json();
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";
        const normalizedCode = typeof code === "string" ? normalizeOtpCode(code) : "";

        if (!normalizedEmail || !normalizedCode || typeof newPassword !== "string") {
            return NextResponse.json(
                { error: "Email, code, and new password are required" },
                { status: 400 }
            );
        }

        if (!isValidEmail(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.ok) {
            return NextResponse.json(
                { error: passwordValidation.error },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired reset request" }, { status: 400 });
        }

        const otpResult = await verifyOtpToken(user.id, normalizedCode, "PASSWORD_RESET");
        if (!otpResult.valid) {
            return NextResponse.json({ error: otpResult.error }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
            },
        });

        return NextResponse.json({ message: "Password changed successfully! You can now log in." });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
