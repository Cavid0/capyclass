import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: code },
        });

        await sendVerificationEmail(user.email, code);

        return NextResponse.json({ message: "OTP kodu göndərildi" });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Xəta baş verdi" }, { status: 500 });
    }
}
