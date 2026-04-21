export function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(" ");
}

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function sanitizeInput(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

export function isCleanText(text: string): boolean {
    return !/<script|<\/script|javascript:|on\w+=/i.test(text);
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function normalizeOtpCode(code: string): string {
    return code.replace(/\s+/g, "").trim();
}

export function validatePasswordStrength(password: unknown): { ok: true } | { ok: false; error: string } {
    if (typeof password !== "string") {
        return { ok: false, error: "Password is invalid" };
    }

    if (password.length < 8) {
        return { ok: false, error: "Password must be at least 8 characters" };
    }

    if (password.length > 128) {
        return { ok: false, error: "Password is too long" };
    }

    if (!/[a-zA-Z]/.test(password)) {
        return { ok: false, error: "Password must contain at least one letter" };
    }

    if (!/[0-9]/.test(password)) {
        return { ok: false, error: "Password must contain at least one number" };
    }

    return { ok: true };
}

export function validateTextInput(
    input: unknown,
    options: {
        fieldName: string;
        maxLength: number;
        multiline?: boolean;
        allowEmpty?: boolean;
    }
): { ok: true; value: string } | { ok: false; error: string } {
    if (typeof input !== "string") {
        return { ok: false, error: `${options.fieldName} is invalid` };
    }

    const value = input.normalize("NFKC").trim();

    if (!options.allowEmpty && !value) {
        return { ok: false, error: `${options.fieldName} is required` };
    }

    if (value.length > options.maxLength) {
        return { ok: false, error: `${options.fieldName} is too long` };
    }

    if (CONTROL_CHAR_REGEX.test(value)) {
        return { ok: false, error: `${options.fieldName} contains invalid characters` };
    }

    if (!options.multiline && /[\r\n]/.test(value)) {
        return { ok: false, error: `${options.fieldName} must be a single line` };
    }

    if (value && !isCleanText(value)) {
        return { ok: false, error: `${options.fieldName} contains unsafe content` };
    }

    return { ok: true, value };
}

export function serializeJsonForHtmlScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
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
