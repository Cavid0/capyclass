import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { generateOtp, isValidEmail, normalizeEmail } from "@/lib/utils";

const OTP_EXPIRY_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 15 minutes." },
                { status: 429 }
            );
        }

        const { email } = await req.json();
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

        if (!normalizedEmail) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        if (!isValidEmail(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user) {
            return NextResponse.json({ message: "If this email exists, an OTP code has been sent" });
        }

        const code = generateOtp();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: code,
                tokenPurpose: "PASSWORD_RESET",
                verificationTokenExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
                otpAttempts: 0,
            },
        });

        try {
            await sendVerificationEmail(normalizedEmail, code);
        } catch (emailError: any) {
            console.error("Forgot password email error:", emailError?.message);
        }

        return NextResponse.json({ message: "If this email exists, an OTP code has been sent" });
    } catch (error: any) {
        console.error("Forgot password error:", error?.message);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
