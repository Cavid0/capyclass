import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { email, code, newPassword } = await req.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json(
                { error: "Email, kod və yeni şifrə tələb olunur" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "Şifrə minimum 6 simvol olmalıdır" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
        }

        if (user.verificationToken !== code) {
            return NextResponse.json({ error: "Kod yanlışdır. Yenidən cəhd edin." }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                verificationToken: null,
            },
        });

        return NextResponse.json({ message: "Şifrə uğurla dəyişdirildi! İndi daxil ola bilərsiniz." });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "Xəta baş verdi" }, { status: 500 });
    }
}
