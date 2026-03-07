"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { PasswordChangeForm } from "@/components/profile/PasswordChangeForm";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import {
    User, Mail, Save, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";

export default function ProfilePage() {
    const { status } = useSession();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
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
        if (name.trim() === profile?.name) { setError("No changes"); return; }

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

    const handlePwdSuccess = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 3000);
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

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="max-w-2xl mx-auto px-6 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">Profile</h1>
                    <p className="text-[var(--text-secondary)] text-sm">Manage your account information</p>
                </div>

                <ProfileCard profile={profile} />

                {/* Edit Name */}
                <form onSubmit={handleSave}>
                    <div className="glass-card p-6 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User className="w-4 h-4" /> Basic Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Full Name</label>
                                <div className="relative">
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field !pl-[42px]" placeholder="Enter your name" />
                                    <User className="absolute left-3.5 top-3 w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                                <div className="relative">
                                    <input type="email" value={profile?.email || ""} disabled className="input-field !pl-[42px] opacity-50 cursor-not-allowed" />
                                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#71717a]" />
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Email cannot be changed</p>
                            </div>
                        </div>
                    </div>

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

                    <button type="submit" disabled={saving} className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm mb-8">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Name</>}
                    </button>
                </form>

                <PasswordChangeForm email={profile?.email || ""} onSuccess={handlePwdSuccess} />
                <DeleteAccountSection email={profile?.email || ""} />
            </main>
        </div>
    );
}
