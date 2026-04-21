import "server-only";
import { randomInt, randomUUID, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

export function generateInviteCode(): string {
    return randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function generateOtp(): string {
    return randomInt(100000, 1000000).toString();
}

function constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
}

const OTP_EXPIRY_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

export async function setOtpToken(
    userId: string,
    purpose: "EMAIL_VERIFY" | "PASSWORD_RESET" | "PASSWORD_CHANGE" | "ACCOUNT_DELETE"
): Promise<string> {
    const code = generateOtp();
    await prisma.user.update({
        where: { id: userId },
        data: {
            verificationToken: code,
            tokenPurpose: purpose,
            verificationTokenExpiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            otpAttempts: 0,
        },
    });
    return code;
}

export async function verifyOtpToken(
    userId: string,
    code: string,
    expectedPurpose: "EMAIL_VERIFY" | "PASSWORD_RESET" | "PASSWORD_CHANGE" | "ACCOUNT_DELETE"
): Promise<{ valid: boolean; error?: string }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            verificationToken: true,
            tokenPurpose: true,
            verificationTokenExpiresAt: true,
            otpAttempts: true,
            otpLockedUntil: true,
        },
    });

    if (!user) return { valid: false, error: "User not found" };

    if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
        const minutesLeft = Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 60_000);
        return { valid: false, error: `Too many attempts. Try again in ${minutesLeft} minutes.` };
    }

    if (!user.verificationToken || !user.verificationTokenExpiresAt) {
        return { valid: false, error: "No active verification code. Please request a new one." };
    }

    if (new Date() > user.verificationTokenExpiresAt) {
        await prisma.user.update({
            where: { id: userId },
            data: { verificationToken: null, tokenPurpose: null, verificationTokenExpiresAt: null },
        });
        return { valid: false, error: "Code has expired. Please request a new one." };
    }

    if (user.tokenPurpose !== expectedPurpose) {
        return { valid: false, error: "Invalid code for this action." };
    }

    if (!constantTimeEqual(user.verificationToken, code)) {
        const newAttempts = (user.otpAttempts || 0) + 1;
        const updateData: any = { otpAttempts: newAttempts };

        if (newAttempts >= MAX_OTP_ATTEMPTS) {
            updateData.otpLockedUntil = new Date(Date.now() + OTP_LOCKOUT_MS);
            updateData.verificationToken = null;
            updateData.tokenPurpose = null;
            updateData.verificationTokenExpiresAt = null;
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });

        if (newAttempts >= MAX_OTP_ATTEMPTS) {
            return { valid: false, error: "Too many failed attempts. Account locked for 15 minutes." };
        }

        return { valid: false, error: `Invalid code. ${MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.` };
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            verificationToken: null,
            tokenPurpose: null,
            verificationTokenExpiresAt: null,
            otpAttempts: 0,
            otpLockedUntil: null,
        },
    });

    return { valid: true };
}
