import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { isValidEmail, isCleanText, generateOtp } from "@/lib/utils";

const OTP_EXPIRY_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!rateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 15 minutes." },
                { status: 429 }
            );
        }
        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            );
        }

        // Input validation
        if (!isValidEmail(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        if (!isCleanText(name)) {
            return NextResponse.json({ error: "Name contains invalid characters" }, { status: 400 });
        }
        if (name.length > 100) {
            return NextResponse.json({ error: "Name is too long" }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }
        if (password.length > 128) {
            return NextResponse.json({ error: "Password is too long" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "This email is already registered" },
                { status: 400 }
            );
        }

        const hashedPassword = await hash(password, 12);
        const verificationCode = generateOtp();

        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
                role: role === "ADMIN" ? "ADMIN" : "USER",
                emailVerified: false,
                verificationToken: verificationCode,
                tokenPurpose: "EMAIL_VERIFY",
                verificationTokenExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            },
        });

        try {
            await sendVerificationEmail(email, verificationCode);
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
                message: "Registration successful. Enter the 6-digit code sent to your email.",
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: error?.message || "An error occurred during registration" },
            { status: 500 }
        );
    }
}
