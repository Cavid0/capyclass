import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Ad, email və şifrə tələb olunur" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Bu email artıq qeydiyyatdan keçib" },
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
            // Email göndərilmədisə hesabı silək ki, yenidən qeydiyyatdan keçə bilsin
            await prisma.user.delete({ where: { id: user.id } });
            return NextResponse.json(
                { error: "Təsdiq emaili göndərilə bilmədi. Zəhmət olmasa bir az sonra yenidən cəhd edin." },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: "Qeydiyyat uğurlu oldu. Email-inizə göndərilən 6 rəqəmli kodu daxil edin.",
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: error?.message || "Qeydiyyat zamanı xəta baş verdi" },
            { status: 500 }
        );
    }
}
