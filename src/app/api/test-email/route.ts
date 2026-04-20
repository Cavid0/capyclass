import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        if (!rateLimit(`test-email:${session.user.id}`, 3, 10 * 60 * 1000)) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again in 10 minutes." },
                { status: 429 }
            );
        }

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
        }

        await sendVerificationEmail(session.user.email, "123456");

        return NextResponse.json({ success: true, message: "Test email sent" });
    } catch (error: any) {
        console.error("[TEST-EMAIL] Error:", error?.message);
        return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
    }
}
