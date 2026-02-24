import { v4 as uuidv4 } from "uuid";

export function generateInviteCode(): string {
    return uuidv4().slice(0, 8).toUpperCase();
}

export function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("az-AZ", {
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
