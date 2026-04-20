import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, generateOtp, normalizeEmail, validatePasswordStrength, validateTextInput } from "@/lib/utils";

const OTP_EXPIRY_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const genericRegistrationMessage = "If registration can be completed, a verification code has been sent to the provided email.";
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 15 minutes." },
                { status: 429 }
            );
        }
        const { name, email, password } = await req.json();
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

        if (!name || !normalizedEmail || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            );
        }

        // Input validation
        if (!isValidEmail(normalizedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        const validatedName = validateTextInput(name, { fieldName: "Name", maxLength: 100 });
        if (!validatedName.ok) {
            return NextResponse.json({ error: validatedName.error }, { status: 400 });
        }
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.ok) {
            return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            if (!existingUser.emailVerified) {
                const verificationCode = generateOtp();
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        verificationToken: verificationCode,
                        tokenPurpose: "EMAIL_VERIFY",
                        verificationTokenExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
                        otpAttempts: 0,
                        otpLockedUntil: null,
                    },
                });

                try {
                    await sendVerificationEmail(normalizedEmail, verificationCode);
                } catch (emailError: any) {
                    console.error("Register resend email error:", emailError?.message);
                }
            }

            return NextResponse.json(
                { message: genericRegistrationMessage },
                { status: 202 }
            );
        }

        const hashedPassword = await hash(password, 12);
        const verificationCode = generateOtp();

        const user = await prisma.user.create({
            data: {
                name: validatedName.value,
                email: normalizedEmail,
                hashedPassword,
                role: "USER",
                emailVerified: false,
                verificationToken: verificationCode,
                tokenPurpose: "EMAIL_VERIFY",
                verificationTokenExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            },
        });

        try {
            await sendVerificationEmail(normalizedEmail, verificationCode);
        } catch (emailError: any) {
            console.error("Register email error:", emailError?.message);
            await prisma.user.delete({ where: { id: user.id } });
            return NextResponse.json(
                { error: "Failed to send verification email. Please try again later." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: genericRegistrationMessage,
            },
            { status: 202 }
        );
    } catch (error: any) {
        console.error("Register error:", error?.message);
        return NextResponse.json(
            { error: "An error occurred during registration" },
            { status: 500 }
        );
    }
}
