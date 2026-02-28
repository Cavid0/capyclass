"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import {
    User, Mail, Shield, Calendar, BookOpen, Code2,
    Save, Lock, CheckCircle, AlertCircle, Loader2, GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Edit states
    const [name, setName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI states
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (status === "authenticated") fetchProfile();
    }, [status]);

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

        if (newPassword && newPassword !== confirmPassword) {
            setError("Yeni şifrələr uyğun gəlmir");
            return;
        }

        setSaving(true);
        try {
            const body: any = {};
            if (name.trim() !== profile?.name) body.name = name.trim();
            if (newPassword) {
                body.currentPassword = currentPassword;
                body.newPassword = newPassword;
            }

            if (Object.keys(body).length === 0) {
                setError("Heç bir dəyişiklik yoxdur");
                setSaving(false);
                return;
            }

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess("Profil uğurla yeniləndi!");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
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

                    </div>
                </div>

                {/* Edit Form */}
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

                    {/* Password Change */}
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Şifrə Dəyişdir
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Cari Şifrə
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="input-field"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                        Yeni Şifrə
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                        Təkrar Şifrə
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
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

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <><Save className="w-4 h-4" /> Dəyişiklikləri Saxla</>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
