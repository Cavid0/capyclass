import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!code) {
            return NextResponse.json(
                { error: "Verification code is required" },
                { status: 400 }
            );
        }

        let user;
        if (email) {
            user = await prisma.user.findUnique({ where: { email } });
        } else {
            user = await prisma.user.findFirst({ where: { verificationToken: code } });
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

        if (user.verificationToken !== code) {
            return NextResponse.json(
                { error: "Invalid code. Please try again." },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
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
