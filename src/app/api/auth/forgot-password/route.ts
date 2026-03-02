import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email tələb olunur" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Güvenlik: istifadəçi var-yox eyni cavab qaytar
        if (!user) {
            return NextResponse.json({ message: "Əgər bu email mövcuddursa, OTP kodu göndərildi" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: code },
        });

        await sendVerificationEmail(email, code);

        return NextResponse.json({ message: "OTP kodu göndərildi" });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Xəta baş verdi" }, { status: 500 });
    }
}
