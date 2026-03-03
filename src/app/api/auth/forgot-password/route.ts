import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 15 minutes." },
                { status: 429 }
            );
        }

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Security: return the same response whether user exists or not
        if (!user) {
            return NextResponse.json({ message: "If this email exists, an OTP code has been sent" });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationToken: code },
        });

        await sendVerificationEmail(email, code);

        return NextResponse.json({ message: "OTP code sent" });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
