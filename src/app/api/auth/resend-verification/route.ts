import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { generateOtp } from "@/lib/utils";

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

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ message: "If the account exists, a code has been sent" });
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { error: "This account is already verified" },
                { status: 400 }
            );
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

        await sendVerificationEmail(email, newCode);

        return NextResponse.json({ message: "New code sent" });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "An error occurred" },
            { status: 500 }
        );
    }
}
