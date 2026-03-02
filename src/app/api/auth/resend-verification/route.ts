import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email tələb olunur" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Güvenlik üçün eyni cavabı qaytarırıq
            return NextResponse.json({ message: "Əgər hesab mövcuddursa, kod göndərildi" });
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { error: "Bu hesab artıq təsdiqlənib" },
                { status: 400 }
            );
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: newCode },
        });

        await sendVerificationEmail(email, newCode);

        return NextResponse.json({ message: "Yeni kod göndərildi" });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Xəta baş verdi" },
            { status: 500 }
        );
    }
}
