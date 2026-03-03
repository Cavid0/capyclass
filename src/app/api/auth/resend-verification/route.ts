import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Security: return the same response regardless
            return NextResponse.json({ message: "If the account exists, a code has been sent" });
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { error: "This account is already verified" },
                { status: 400 }
            );
        }

        const newCode = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: newCode },
        });

        await sendVerificationEmail(email, newCode);

        return NextResponse.json({ message: "New code sent" });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "An error occurred" },
            { status: 500 }
        );
    }
}
