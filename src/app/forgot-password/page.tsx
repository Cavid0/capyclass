"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function ForgotPasswordPage() {
    const router = useRouter();

    // 3 steps: email → otp → newPassword
    const [step, setStep] = useState<"email" | "otp" | "newpass">("email");

    // Step 1
    const [email, setEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    // Step 2 — OTP
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpError, setOtpError] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Step 3 — New password
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState("");

    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown]);

    useEffect(() => {
        if (step === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, [step]);

    // ── Step 1: Send OTP ──────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError("");
        setEmailLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
            setStep("otp");
            setResendCooldown(60);
        } catch (err: any) {
            setEmailError(err.message);
        } finally {
            setEmailLoading(false);
        }
    };

    // ── OTP handlers ──────────────────────────────────────────
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setOtpError("");
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
    };
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        const newOtp = [...otp];
        text.split("").forEach((ch, i) => { newOtp[i] = ch; });
        setOtp(newOtp);
        inputRefs.current[Math.min(text.length, 5)]?.focus();
    };

    // ── Step 2: Verify OTP (client-side, real verify happens in step 3) ─────
    const handleVerifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setOtpError("Enter all 6 digits"); return; }
        setOtpError("");
        setStep("newpass");
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setEmailLoading(true);
        try {
            await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
            setResendCooldown(60);
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Step 3: Set new password ──────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError("");
        if (!newPassword || newPassword.length < 8) { setPwdError("Password must be at least 8 characters"); return; }
        if (!/[a-zA-Z]/.test(newPassword)) { setPwdError("Password must contain at least one letter"); return; }
        if (!/[0-9]/.test(newPassword)) { setPwdError("Password must contain at least one number"); return; }
        if (!confirmPassword) { setPwdError("Please confirm your password"); return; }
        if (newPassword !== confirmPassword) { setPwdError("Passwords do not match"); return; }
        setPwdLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otp.join(""), newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
            router.push("/login?verified=true");
        } catch (err: any) {
            setPwdError(err.message);
        } finally {
            setPwdLoading(false);
        }
    };

    const isOtpFull = otp.every((d) => d !== "");
    const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-600/[0.04] blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-sm z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                            <Image src="/capybara.png" alt="CapyClass" width={32} height={32} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">CapyClass</span>
                    </Link>
                </div>

                <div className="glass-card p-6 sm:p-8">

                    {/* ── Step 1: Email ── */}
                    {step === "email" && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Reset Password</h1>
                                <p className="text-[var(--text-secondary)] text-sm">We’ll send a verification code to your email</p>
                            </div>

                            {emailError && (
                                <div className="mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{emailError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Email *</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-field !pl-[42px]"
                                            placeholder="mail@example.com"
                                        />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Mail className="w-4 h-4 text-[#71717a]" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={emailLoading} className="glow-btn w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-sm">
                                    {emailLoading
                                        ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        : <>Send OTP <ArrowRight className="w-3.5 h-3.5" /></>
                                    }
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center text-sm">
                                <Link href="/login" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Back to Login
                                </Link>
                            </div>
                        </>
                    )}

                    {/* ── Step 2: OTP ── */}
                    {step === "otp" && (
                        <>
                            <div className="flex justify-center mb-5">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="mb-6 text-center">
                                <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Enter Code</h1>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    <span className="text-white font-medium">{email}</span><br />A 6-digit code has been sent
                                </p>
                            </div>

                            {otpError && (
                                <div className="mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{otpError}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp}>
                                <div className="flex justify-center gap-2 mb-6">
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { inputRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            onPaste={i === 0 ? handleOtpPaste : undefined}
                                            style={{ height: "52px" }}
                                            className={[
                                                "w-11 text-center text-xl font-bold rounded-lg border bg-[var(--bg-card)] text-white outline-none transition-all",
                                                digit ? "border-white/50" : "border-[var(--border-color)]",
                                                "focus:border-white/70 focus:ring-1 focus:ring-white/20",
                                            ].join(" ")}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={!isOtpFull}
                                    className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <>Verify Code <ArrowRight className="w-3.5 h-3.5" /></>
                                </button>
                            </form>

                            <div className="mt-5 text-center text-sm">
                                <span className="text-[var(--text-secondary)]">Didn’t receive the code? </span>
                                {resendCooldown > 0
                                    ? <span className="text-[var(--text-secondary)]">{resendCooldown}s wait</span>
                                    : <button onClick={handleResend} disabled={emailLoading} className="text-white hover:underline underline-offset-4 disabled:opacity-50">
                                        Resend
                                    </button>
                                }
                            </div>
                            <div className="mt-3 text-center">
                                <button onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setOtpError(""); }} className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Go back
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── Step 3: New password ── */}
                    {step === "newpass" && (
                        <>
                            <div className="flex justify-center mb-5">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Lock className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="mb-6 text-center">
                                <h1 className="text-xl font-semibold text-white tracking-tight mb-1">New Password</h1>
                                <p className="text-[var(--text-secondary)] text-sm">Enter your new password</p>
                            </div>

                            {pwdError && (
                                <div className="mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{pwdError}</span>
                                </div>
                            )}

                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">New Password *</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="input-field !pl-[42px] tracking-widest"
                                            placeholder="••••••••"
                                        />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Lock className="w-4 h-4 text-[#71717a]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Confirm Password *</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            minLength={8}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`input-field !pl-[42px] tracking-widest ${passwordsMismatch ? "!border-red-500/60" : passwordsMatch ? "!border-emerald-500/60" : ""}`}
                                            placeholder="••••••••"
                                        />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Lock className="w-4 h-4 text-[#71717a]" />
                                        </div>
                                    </div>
                                    {passwordsMismatch && (
                                        <p className="text-[11px] text-red-400 flex items-center gap-1"><span>✗</span> Passwords do not match</p>
                                    )}
                                    {passwordsMatch && (
                                        <p className="text-[11px] text-emerald-400 flex items-center gap-1"><span>✓</span> Passwords match</p>
                                    )}
                                </div>
                                <button type="submit" disabled={pwdLoading || passwordsMismatch || !confirmPassword} className="glow-btn w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {pwdLoading
                                        ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        : <><CheckCircle2 className="w-3.5 h-3.5" /> Change Password</>
                                    }
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
