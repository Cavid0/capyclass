import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

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
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
                role: role === "TEACHER" ? "TEACHER" : "STUDENT",
                emailVerified: false,
                verificationToken: verificationCode,
            },
        });

        try {
            await sendVerificationEmail(email, verificationCode);
        } catch (emailError: any) {
            console.error("Register email error:", emailError?.message);
            // If email failed, delete the account so they can register again
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
