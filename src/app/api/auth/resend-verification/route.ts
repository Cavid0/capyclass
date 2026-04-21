import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { generateOtp } from "@/lib/server-utils";

export async function POST(req: NextRequest) {
    try {
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        if (!rateLimit(`resend-verify:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429 }
            );
        }

        const { email } = await req.json();
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

        if (!normalizedEmail) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        if (!isValidEmail(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        if (!user || user.emailVerified) {
            return NextResponse.json({ message: "If the account can receive verification, a new code has been sent" });
        }

        const newCode = generateOtp();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationToken: newCode,
                tokenPurpose: "EMAIL_VERIFY",
                verificationTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
                otpAttempts: 0,
                otpLockedUntil: null,
            },
        });

        try {
            await sendVerificationEmail(normalizedEmail, newCode);
        } catch (emailError: any) {
            console.error("Resend verification email error:", emailError?.message);
        }

        return NextResponse.json({ message: "If the account can receive verification, a new code has been sent" });
    } catch (error: any) {
        console.error("Resend verification error:", error?.message);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
