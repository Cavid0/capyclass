"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mail, Lock, User, AlertCircle, ArrowRight, Layers, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const { status } = useSession();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [step, setStep] = useState<"register" | "verify">("register");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [status, router]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown]);

    useEffect(() => {
        if (step === "verify") {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    if (status === "loading" || status === "authenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="spinner" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role: "STUDENT" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Xəta baş verdi");
            setStep("verify");
            setResendCooldown(60);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setVerifyError("");
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

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setVerifyError("Bütün 6 rəqəmi daxil edin"); return; }
        setVerifyError("");
        setVerifyLoading(true);
        try {
            const res = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();
            if (!res.ok) {
                setOtp(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                throw new Error(data.error || "Xəta baş verdi");
            }
            router.push("/login?verified=true");
        } catch (err: any) {
            setVerifyError(err.message);
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResendLoading(true);
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Xəta baş verdi");
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
            setResendCooldown(60);
        } catch (err: any) {
            setVerifyError(err.message);
        } finally {
            setResendLoading(false);
        }
    };

    const isOtpFull = otp.every((d) => d !== "");

    return (
        <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />

            <div className="w-full max-w-sm z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center group-hover:border-white transition-colors">
                            <Layers className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">ClassFlow</span>
                    </Link>
                </div>

                <div className="glass-card p-6 sm:p-8">

                    {/* ── Addım 1: Qeydiyyat formu ── */}
                    {step === "register" && (
                        <>
                            <div className="mb-6">
                                <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Hesab yarat</h1>
                                <p className="text-[var(--text-secondary)] text-sm">Məlumatları doldurun</p>
                            </div>

                            {error && (
                                <div className="mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Ad Soyad *</label>
                                    <div className="relative">
                                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field !pl-[42px]" placeholder="Ad Soyad" />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><User className="w-4 h-4 text-[#71717a]" /></div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Email *</label>
                                    <div className="relative">
                                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field !pl-[42px]" placeholder="mail@unvan.az" />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><Mail className="w-4 h-4 text-[#71717a]" /></div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Şifrə *</label>
                                    <div className="relative">
                                        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field !pl-[42px] tracking-widest" placeholder="••••••••" />
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"><Lock className="w-4 h-4 text-[#71717a]" /></div>
                                    </div>
                                </div>
                                <button type="submit" disabled={loading} className="glow-btn w-full py-2.5 mt-4 flex items-center justify-center gap-2 text-sm">
                                    {loading ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <>Hesab Yarat <ArrowRight className="w-3.5 h-3.5" /></>}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center text-sm">
                                <span className="text-[var(--text-secondary)]">Təkrar istifadəçi? </span>
                                <Link href="/login" className="text-white hover:underline underline-offset-4">Giriş edin</Link>
                            </div>
                        </>
                    )}

                    {/* ── Addım 2: OTP kodu daxil et ── */}
                    {step === "verify" && (
                        <>
                            <div className="flex justify-center mb-5">
                                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="mb-6 text-center">
                                <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Kodu daxil edin</h1>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    <span className="text-white font-medium">{email}</span> ünvanına<br />6 rəqəmli doğrulama kodu göndərildi
                                </p>
                            </div>

                            {verifyError && (
                                <div className="mb-5 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{verifyError}</span>
                                </div>
                            )}

                            <form onSubmit={handleVerify}>
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
                                    disabled={verifyLoading || !isOtpFull}
                                    className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifyLoading
                                        ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        : <>Təsdiqlə <ShieldCheck className="w-3.5 h-3.5" /></>}
                                </button>
                            </form>

                            <div className="mt-5 text-center text-sm">
                                <span className="text-[var(--text-secondary)]">Kod gəlmədi? </span>
                                {resendCooldown > 0
                                    ? <span className="text-[var(--text-secondary)]">{resendCooldown}s gözləyin</span>
                                    : <button onClick={handleResend} disabled={resendLoading} className="text-white hover:underline underline-offset-4 disabled:opacity-50">
                                        {resendLoading ? "Göndərilir..." : "Yenidən göndər"}
                                    </button>
                                }
                            </div>
                            <div className="mt-3 text-center">
                                <button onClick={() => { setStep("register"); setOtp(["", "", "", "", "", ""]); setVerifyError(""); }} className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Geri qayıt
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
