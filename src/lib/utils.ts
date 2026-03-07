import { v4 as uuidv4 } from "uuid";
import { prisma } from "./prisma";

export function generateInviteCode(): string {
    return uuidv4().slice(0, 8).toUpperCase();
}

export function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(" ");
}

/** Sanitize user input to prevent XSS */
export function sanitizeInput(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/** Validate safe text (no HTML/scripts) */
export function isCleanText(text: string): boolean {
    return !/<script|<\/script|javascript:|on\w+=/i.test(text);
}

/** Generate a 6-digit OTP code */
export function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/** OTP expiration time: 15 minutes */
const OTP_EXPIRY_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS = 15 * 60 * 1000;

/** Save an OTP token with purpose and expiry */
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

/** Verify an OTP token — checks purpose, expiry, and brute-force lockout */
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

    // Check lockout
    if (user.otpLockedUntil && new Date() < user.otpLockedUntil) {
        const minutesLeft = Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 60_000);
        return { valid: false, error: `Too many attempts. Try again in ${minutesLeft} minutes.` };
    }

    // Check expiry
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

    // Check purpose
    if (user.tokenPurpose !== expectedPurpose) {
        return { valid: false, error: "Invalid code for this action." };
    }

    // Check code
    if (user.verificationToken !== code) {
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

    // Success — clear the token
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

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(date));
}

export function getStatusColor(status: string): string {
    switch (status) {
        case "PASS":
            return "text-emerald-400";
        case "FAIL":
            return "text-red-400";
        default:
            return "text-amber-400";
    }
}

export function getStatusBgColor(status: string): string {
    switch (status) {
        case "PASS":
            return "bg-emerald-500/20 border-emerald-500/30";
        case "FAIL":
            return "bg-red-500/20 border-red-500/30";
        default:
            return "bg-amber-500/20 border-amber-500/30";
    }
}
