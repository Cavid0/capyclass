"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import { OtpInput } from "./OtpInput";

interface DeleteAccountSectionProps {
    email: string;
}

export function DeleteAccountSection({ email }: DeleteAccountSectionProps) {
    const [step, setStep] = useState<"idle" | "confirm" | "otp">("idle");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown]);

    useEffect(() => {
        if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, [step]);

    const handleSendOtp = async () => {
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp?purpose=ACCOUNT_DELETE", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
            setStep("otp");
            setResendCooldown(60);
            setOtp(["", "", "", "", "", ""]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setError("Enter all 6 digits"); return; }
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/delete-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: code }),
            });
            const data = await res.json();
            if (!res.ok) {
                setOtp(["", "", "", "", "", ""]);
                throw new Error(data.error || "An error occurred");
            }
            await signOut({ callbackUrl: "/" });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp?purpose=ACCOUNT_DELETE", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setOtp(["", "", "", "", "", ""]);
            setResendCooldown(60);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 mt-6 border-red-500/20">
            <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Delete Account
            </h3>

            {step === "idle" && (
                <>
                    <p className="text-[var(--text-secondary)] text-xs mb-4 leading-relaxed">
                        Your account will be deleted. All your classrooms, tasks, and code will be permanently removed. This action cannot be undone.
                    </p>
                    <button
                        onClick={() => setStep("confirm")}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 className="w-4 h-4" /> I Want to Delete My Account
                    </button>
                </>
            )}

            {step === "confirm" && (
                <div className="space-y-4">
                    <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <p className="font-semibold mb-1">Warning!</p>
                        <p className="text-xs leading-relaxed">
                            This action is permanent. All data associated with your account (classrooms, tasks, code) will be deleted.
                            To continue, an OTP code will be sent to your email.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setStep("idle"); setError(""); }}
                            className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendOtp}
                            disabled={loading}
                            className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                        </button>
                    </div>
                </div>
            )}

            {step === "otp" && (
                <form onSubmit={handleConfirm} className="space-y-4">
                    <div className="text-center mb-2">
                        <div className="flex justify-center mb-3">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-400" />
                            </div>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm">
                            A code was sent to <span className="text-white font-medium">{email}</span>
                        </p>
                        <p className="text-red-400 text-xs mt-1">
                            Enter the code — your account will be permanently deleted
                        </p>
                    </div>

                    <OtpInput otp={otp} onChange={setOtp} accentColor="red" />

                    {error && (
                        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || otp.join("").length < 6}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete Account</>}
                    </button>

                    <div className="flex items-center justify-between text-xs">
                        <button type="button" onClick={() => { setStep("idle"); setError(""); setOtp(["", "", "", "", "", ""]); }} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                            ← Cancel
                        </button>
                        {resendCooldown > 0
                            ? <span className="text-[var(--text-secondary)]">{resendCooldown}s wait</span>
                            : <button type="button" onClick={handleResend} disabled={loading} className="text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50">
                                Resend
                            </button>
                        }
                    </div>
                </form>
            )}
        </div>
    );
}
