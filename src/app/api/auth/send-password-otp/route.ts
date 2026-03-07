import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { setOtpToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;

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

        // Determine purpose from query param or default to PASSWORD_CHANGE
        const url = new URL(req.url);
        const purposeParam = url.searchParams.get("purpose");
        const purpose = purposeParam === "ACCOUNT_DELETE" ? "ACCOUNT_DELETE" as const : "PASSWORD_CHANGE" as const;

        const code = await setOtpToken(userId, purpose);
        await sendVerificationEmail(user.email, code);

        return NextResponse.json({ message: "OTP code sent" });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 });
    }
}
