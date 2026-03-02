import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json(
                { error: "Email və kod tələb olunur" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "İstifadəçi tapılmadı" },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json({ message: "Email artıq təsdiqlənib" });
        }

        if (user.verificationToken !== code) {
            return NextResponse.json(
                { error: "Kod yanlışdır. Yenidən cəhd edin." },
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

        return NextResponse.json({ message: "Email uğurla təsdiqləndi! İndi daxil ola bilərsiniz." });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Xəta baş verdi" },
            { status: 500 }
        );
    }
}
