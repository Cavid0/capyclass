"use client";

import { useState, useRef, useEffect } from "react";
import { Lock, ShieldCheck, KeyRound, AlertCircle, Loader2 } from "lucide-react";
import { OtpInput } from "./OtpInput";

interface PasswordChangeFormProps {
    email: string;
    onSuccess: (msg: string) => void;
}

export function PasswordChangeForm({ email, onSuccess }: PasswordChangeFormProps) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [step, setStep] = useState<"form" | "otp">("form");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpLoading, setOtpLoading] = useState(false);
    const [saving, setSaving] = useState(false);
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

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!newPassword) { setError("Enter new password"); return; }
        if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
        if (!/[a-zA-Z]/.test(newPassword)) { setError("Password must contain at least one letter"); return; }
        if (!/[0-9]/.test(newPassword)) { setError("Password must contain at least one number"); return; }
        if (!confirmPassword) { setError("Please confirm your password"); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

        setOtpLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
            setStep("otp");
            setResendCooldown(60);
            setOtp(["", "", "", "", "", ""]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setError("Enter all 6 digits"); return; }
        setError("");
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: code, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess("Password changed successfully!");
                setNewPassword("");
                setConfirmPassword("");
                setStep("form");
                setOtp(["", "", "", "", "", ""]);
            } else {
                setOtp(["", "", "", "", "", ""]);
                setError(data.error || "An error occurred");
            }
        } catch {
            setError("Connection error");
        } finally {
            setSaving(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setOtpLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setOtp(["", "", "", "", "", ""]);
            setResendCooldown(60);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    return (
        <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Change Password
            </h3>

            {step === "form" && (() => {
                const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
                const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
                return (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`input-field ${passwordsMismatch ? "!border-red-500/60" : passwordsMatch ? "!border-emerald-500/60" : ""}`}
                                placeholder="••••••••"
                            />
                            {passwordsMismatch && (
                                <p className="mt-1 text-[11px] text-red-400 flex items-center gap-1"><span>✗</span> Passwords do not match</p>
                            )}
                            {passwordsMatch && (
                                <p className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1"><span>✓</span> Passwords match</p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={otpLoading || passwordsMismatch || !newPassword || !confirmPassword}
                        className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" /> Send OTP Code</>}
                    </button>
                </form>
                );
            })()}

            {step === "otp" && (
                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="text-center mb-2">
                        <div className="flex justify-center mb-3">
                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm">
                            A code was sent to <span className="text-white font-medium">{email}</span>
                        </p>
                    </div>

                    <OtpInput otp={otp} onChange={setOtp} />

                    {error && (
                        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving || otp.join("").length < 6}
                        className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify & Change</>}
                    </button>

                    <div className="flex items-center justify-between text-xs">
                        <button type="button" onClick={() => { setStep("form"); setError(""); setOtp(["", "", "", "", "", ""]); }} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                            ← Go back
                        </button>
                        {resendCooldown > 0
                            ? <span className="text-[var(--text-secondary)]">{resendCooldown}s wait</span>
                            : <button type="button" onClick={handleResend} disabled={otpLoading} className="text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50">
                                Resend
                            </button>
                        }
                    </div>
                </form>
            )}
        </div>
    );
}
