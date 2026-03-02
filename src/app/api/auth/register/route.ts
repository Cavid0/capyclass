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

        await prisma.user.create({
            data: {
                name,
                email,
                hashedPassword,
                role: role === "TEACHER" ? "TEACHER" : "STUDENT",
                emailVerified: false,
                verificationToken: verificationCode,
            },
        });

        await sendVerificationEmail(email, verificationCode);

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
