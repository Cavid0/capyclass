import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        if (!rateLimit(`otp:${userId}`, 3, 5 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 5 minutes." },
                { status: 429 }
            );
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: code },
        });

        await sendVerificationEmail(user.email, code);

        return NextResponse.json({ message: "OTP code sent" });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
