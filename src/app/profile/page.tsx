"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import {
    User, Mail, Calendar, BookOpen,
    Save, Lock, CheckCircle, AlertCircle, Loader2, ShieldCheck, KeyRound, Trash2
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

    // Delete account
    const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "otp">("idle");
    const [deleteOtp, setDeleteOtp] = useState(["", "", "", "", "", ""]);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [deleteResendCooldown, setDeleteResendCooldown] = useState(0);
    const deleteInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        if (deleteResendCooldown > 0) {
            const t = setTimeout(() => setDeleteResendCooldown((c) => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [deleteResendCooldown]);

    useEffect(() => {
        if (pwdStep === "otp") setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }, [pwdStep]);

    useEffect(() => {
        if (deleteStep === "otp") setTimeout(() => deleteInputRefs.current[0]?.focus(), 100);
    }, [deleteStep]);

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
            setError("No changes");
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
                setSuccess("Name updated successfully!");
                fetchProfile();
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setError(data.error || "An error occurred");
            }
        } catch {
            setError("Connection error");
        } finally {
            setSaving(false);
        }
    };

    // Step 1: validate new password and send OTP
    const handleSendPasswordOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwdError("");

        if (!newPassword) { setPwdError("Enter new password"); return; }
        if (newPassword.length < 6) { setPwdError("Password must be at least 6 characters"); return; }
        if (newPassword !== confirmPassword) { setPwdError("Passwords do not match"); return; }

        setOtpLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
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
        if (code.length < 6) { setPwdError("Enter all 6 digits"); return; }
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
                setSuccess("Password changed successfully!");
                setNewPassword("");
                setConfirmPassword("");
                setPwdStep("form");
                setOtp(["", "", "", "", "", ""]);
                setTimeout(() => setSuccess(""), 3000);
            } else {
                setOtp(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                setPwdError(data.error || "An error occurred");
            }
        } catch {
            setPwdError("Connection error");
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

    // ── Delete account ──
    const handleDeleteSendOtp = async () => {
        setDeleteError("");
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "An error occurred");
            setDeleteStep("otp");
            setDeleteResendCooldown(60);
            setDeleteOtp(["", "", "", "", "", ""]);
        } catch (err: any) {
            setDeleteError(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...deleteOtp];
        newOtp[index] = value.slice(-1);
        setDeleteOtp(newOtp);
        setDeleteError("");
        if (value && index < 5) deleteInputRefs.current[index + 1]?.focus();
    };
    const handleDeleteOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !deleteOtp[index] && index > 0) deleteInputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowLeft" && index > 0) deleteInputRefs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < 5) deleteInputRefs.current[index + 1]?.focus();
    };
    const handleDeleteOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        const newOtp = [...deleteOtp];
        text.split("").forEach((ch, i) => { newOtp[i] = ch; });
        setDeleteOtp(newOtp);
        deleteInputRefs.current[Math.min(text.length, 5)]?.focus();
    };

    const handleDeleteConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = deleteOtp.join("");
        if (code.length < 6) { setDeleteError("Enter all 6 digits"); return; }
        setDeleteError("");
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/auth/delete-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: code }),
            });
            const data = await res.json();
            if (!res.ok) {
                setDeleteOtp(["", "", "", "", "", ""]);
                deleteInputRefs.current[0]?.focus();
                throw new Error(data.error || "An error occurred");
            }
            await signOut({ callbackUrl: "/" });
        } catch (err: any) {
            setDeleteError(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleDeleteResendOtp = async () => {
        if (deleteResendCooldown > 0) return;
        setDeleteLoading(true);
        try {
            const res = await fetch("/api/auth/send-password-otp", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDeleteOtp(["", "", "", "", "", ""]);
            deleteInputRefs.current[0]?.focus();
            setDeleteResendCooldown(60);
        } catch (err: any) {
            setDeleteError(err.message);
        } finally {
            setDeleteLoading(false);
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
                    <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Profile</h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        Manage your account information
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
                                Classrooms
                            </div>
                        </div>
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            </div>
                            <div className="text-sm font-bold text-white">
                                {profile?.createdAt ? new Date(profile.createdAt).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                                Joined
                            </div>
                        </div>

                    </div>
                </div>

                {/* Edit Form — Name only */}
                <form onSubmit={handleSave}>
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Basic Information
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input-field !pl-[42px]"
                                        placeholder="Enter your name"
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
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Email cannot be changed</p>
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
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Name</>}
                    </button>
                </form>

                {/* Password Change — OTP flow */}
                <div className="glass-card p-6">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Change Password
                    </h3>

                    {pwdStep === "form" && (
                        <form onSubmit={handleSendPasswordOtp} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">New Password</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Confirm Password</label>
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
                                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4" /> Send OTP Code</>}
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
                                    A code was sent to <span className="text-white font-medium">{profile?.email}</span>
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
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Verify & Change</>}
                            </button>

                            <div className="flex items-center justify-between text-xs">
                                <button type="button" onClick={() => { setPwdStep("form"); setPwdError(""); setOtp(["", "", "", "", "", ""]); }} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Go back
                                </button>
                                {resendCooldown > 0
                                    ? <span className="text-[var(--text-secondary)]">{resendCooldown}s wait</span>
                                    : <button type="button" onClick={handleResendOtp} disabled={otpLoading} className="text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50">
                                        Resend
                                    </button>
                                }
                            </div>
                        </form>
                    )}
                </div>

                {/* Delete Account */}
                <div className="glass-card p-6 mt-6 border-red-500/20">
                    <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete Account
                    </h3>

                    {deleteStep === "idle" && (
                        <>
                            <p className="text-[var(--text-secondary)] text-xs mb-4 leading-relaxed">
                                Your account will be deleted. All your classrooms, tasks, and code will be permanently removed. This action cannot be undone.
                            </p>
                            <button
                                onClick={() => setDeleteStep("confirm")}
                                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 className="w-4 h-4" /> I Want to Delete My Account
                            </button>
                        </>
                    )}

                    {deleteStep === "confirm" && (
                        <div className="space-y-4">
                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                <p className="font-semibold mb-1">Warning!</p>
                                <p className="text-xs leading-relaxed">
                                    This action is permanent. All data associated with your account (classrooms, tasks, code) will be deleted.
                                    To continue, an OTP code will be sent to your email.
                                </p>
                            </div>

                            {deleteError && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{deleteError}</span>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setDeleteStep("idle"); setDeleteError(""); }}
                                    className="flex-1 py-2.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteSendOtp}
                                    disabled={deleteLoading}
                                    className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
                                </button>
                            </div>
                        </div>
                    )}

                    {deleteStep === "otp" && (
                        <form onSubmit={handleDeleteConfirm} className="space-y-4">
                            <div className="text-center mb-2">
                                <div className="flex justify-center mb-3">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                        <Trash2 className="w-6 h-6 text-red-400" />
                                    </div>
                                </div>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    A code was sent to <span className="text-white font-medium">{profile?.email}</span>
                                </p>
                                <p className="text-red-400 text-xs mt-1">
                                    Enter the code — your account will be permanently deleted
                                </p>
                            </div>

                            <div className="flex justify-center gap-2">
                                {deleteOtp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { deleteInputRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleDeleteOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleDeleteOtpKeyDown(i, e)}
                                        onPaste={i === 0 ? handleDeleteOtpPaste : undefined}
                                        style={{ height: "52px" }}
                                        className={[
                                            "w-11 text-center text-xl font-bold rounded-lg border bg-[var(--bg-card)] text-white outline-none transition-all",
                                            digit ? "border-red-500/50" : "border-[var(--border-color)]",
                                            "focus:border-red-500/70 focus:ring-1 focus:ring-red-500/20",
                                        ].join(" ")}
                                    />
                                ))}
                            </div>

                            {deleteError && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{deleteError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={deleteLoading || deleteOtp.join("").length < 6}
                                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete Account</>}
                            </button>

                            <div className="flex items-center justify-between text-xs">
                                <button type="button" onClick={() => { setDeleteStep("idle"); setDeleteError(""); setDeleteOtp(["", "", "", "", "", ""]); }} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                    ← Cancel
                                </button>
                                {deleteResendCooldown > 0
                                    ? <span className="text-[var(--text-secondary)]">{deleteResendCooldown}s wait</span>
                                    : <button type="button" onClick={handleDeleteResendOtp} disabled={deleteLoading} className="text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50">
                                        Resend
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
