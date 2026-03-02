"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import {
    User, Mail, Calendar, BookOpen,
    Save, Lock, CheckCircle, AlertCircle, Loader2, ShieldCheck, KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Name edit
    const [name, setName] = useState("");

    // Password change
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // OTP step for password change
    const [pwdStep, setPwdStep] = useState<"form" | "otp">("form");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // UI states
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");
    const [pwdError, setPwdError] = useState("");

    useEffect(() => {
        if (status === "authenticated") fetchProfile();
    }, [status]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [resendCooldown]);

    useEffect(() => {
        if (pwdStep === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, [pwdStep]);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/profile");
            const data = await res.json();
            setProfile(data);
            setName(data.name || "");
        } catch {
            console.error("Profile fetch error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (name.trim() === profile?.name) {
            setError("Heç bir dəyişiklik yoxdur");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("Ad uğurla yeniləndi!");
                fetchProfile();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setError(data.error || "Xəta baş verdi");
            }
        } catch {
            setError("Bağlantı xətası");
        } finally {
            setSaving(false);
        }
    };

    // Step 1: validate new password and send OTP
    const handleSendPasswordOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError("");

        if (!newPassword) { setPwdError("Yeni şifrəni daxil edin"); return; }
        if (newPassword.length < 6) { setPwdError("Şifrə minimum 6 simvol olmalıdır"); return; }
        if (newPassword !== confirmPassword) { setPwdError("Şifrələr uyğun gəlmir"); return; }

        setOtpLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Xəta baş verdi");
            setPwdStep("otp");
            setResendCooldown(60);
            setOtp(["", "", "", "", "", ""]);
        } catch (err: any) {
            setPwdError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setPwdError("");
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

    // Step 2: verify OTP and change password
    const handleVerifyAndChangePwd = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setPwdError("Bütün 6 rəqəmi daxil edin"); return; }
        setPwdError("");
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: code, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("Şifrə uğurla dəyişdirildi!");
                setNewPassword("");
                setConfirmPassword("");
                setPwdStep("form");
                setOtp(["", "", "", "", "", ""]);
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setOtp(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                setPwdError(data.error || "Xəta baş verdi");
            }
        } catch {
            setPwdError("Bağlantı xətası");
        } finally {
            setSaving(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;
        setOtpLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
            setResendCooldown(60);
        } catch (err: any) {
            setPwdError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    if (status === "unauthenticated") return null;
    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <Navbar />
                <div className="flex justify-center items-center h-[60vh]">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    const totalClasses = (profile?._count?.classrooms || 0) + (profile?._count?.enrollments || 0);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="max-w-2xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Profil</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Hesab məlumatlarınızı idarə edin
                    </p>
                </div>

                {/* Profile Card */}
                <div className="glass-card p-6 mb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-[var(--border-color)] flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                                {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white tracking-tight">
                                {profile?.name}
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)]">{profile?.email}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            </div>
                            <div className="text-lg font-bold text-white">
                                {totalClasses}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                                Sinif sayı
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            </div>
                            <div className="text-sm font-bold text-white">
                                {profile?.createdAt ? new Date(profile.createdAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                                Qoşulub
                            </div>
                        </div>

                    </div>
                </div>

                {/* Edit Form — Name only */}
                <form onSubmit={handleSave}>
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Əsas Məlumatlar
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Ad Soyad
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field !pl-[42px]"
                                        placeholder="Adınızı daxil edin"
                                    />
                                    <User className="absolute left-3.5 top-3 w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={profile?.email || ""}
                                        disabled
                                        className="input-field !pl-[42px] opacity-50 cursor-not-allowed"
                                    />
                                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#71717a]" />
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Email dəyişdirilə bilməz</p>
                            </div>
                        </div>
                    </div>

                    {/* Name save messages */}
                    {success && (
                        <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-sm">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm mb-8"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Adı Saxla</>}
                    </button>
                </form>

                {/* Password Change — OTP flow */}
                <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Şifrə Dəyişdir
                    </h3>

                    {pwdStep === "form" && (
                        <form onSubmit={handleSendPasswordOtp} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Yeni Şifrə</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Təkrar Şifrə</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                                </div>
                            </div>

                            {pwdError && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{pwdError}</span>
                                </div>
                            )}

                            <button type="submit" disabled={otpLoading} className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" /> OTP Kodu Göndər</>}
                            </button>
                        </form>
                    )}

                    {pwdStep === "otp" && (
                        <form onSubmit={handleVerifyAndChangePwd} className="space-y-4">
                            <div className="text-center mb-2">
                                <div className="flex justify-center mb-3">
                                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    <span className="text-white font-medium">{profile?.email}</span> ünvanına kod göndərildi
                                </p>
                            </div>

                            <div className="flex justify-center gap-2">
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

                            {pwdError && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{pwdError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving || otp.join("").length < 6}
                                className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Təsdiqlə və Dəyişdir</>}
                            </button>

                            <div className="flex items-center justify-between text-xs">
                                <button type="button" onClick={() => { setPwdStep("form"); setPwdError(""); setOtp(["", "", "", "", "", ""]); }} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Geri qayıt
                                </button>
                                {resendCooldown > 0
                                    ? <span className="text-[var(--text-secondary)]">{resendCooldown}s gözləyin</span>
                                    : <button type="button" onClick={handleResendOtp} disabled={otpLoading} className="text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50">
                                        Yenidən göndər
                                    </button>
                                }
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
