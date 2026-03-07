"use client";

import { useRef } from "react";

interface OtpInputProps {
    otp: string[];
    onChange: (otp: string[]) => void;
    onError?: () => void;
    accentColor?: "white" | "red";
}

export function OtpInput({ otp, onChange, accentColor = "white" }: OtpInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        onChange(newOtp);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        const newOtp = [...otp];
        text.split("").forEach((ch, i) => { newOtp[i] = ch; });
        onChange(newOtp);
        inputRefs.current[Math.min(text.length, 5)]?.focus();
    };

    const borderActive = accentColor === "red" ? "border-red-500/50" : "border-white/50";
    const borderFocus = accentColor === "red" ? "focus:border-red-500/70 focus:ring-1 focus:ring-red-500/20" : "focus:border-white/70 focus:ring-1 focus:ring-white/20";

    return (
        <div className="flex justify-center gap-2">
            {otp.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    style={{ height: "52px" }}
                    className={[
                        "w-11 text-center text-xl font-bold rounded-lg border bg-[var(--bg-card)] text-white outline-none transition-all",
                        digit ? borderActive : "border-[var(--border-color)]",
                        borderFocus,
                    ].join(" ")}
                />
            ))}
        </div>
    );

    // Expose focus method for parent usage
}

export function focusFirst(refs: React.MutableRefObject<(HTMLInputElement | null)[]>) {
    refs.current[0]?.focus();
}
