"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Mail, Lock, User, AlertCircle, BookOpen, GraduationCap, Code2, ArrowRight, Layers } from "lucide-react";
import { Role } from "@prisma/client";

export default function RegisterPage() {
    const router = useRouter();
    const { status } = useSession();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/dashboard");
        }
    }, [status, router]);

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

            if (!res.ok) {
                throw new Error(data.error || "Xəta baş verdi");
            }

            const signInRes = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (signInRes?.error) {
                router.push("/login?registered=true");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12 relative overflow-hidden">
            {/* Background decoration */}
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
                    <div className="mb-6">
                        <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Hesab yarat</h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            Məlumatları doldurun
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Ad Soyad *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field !pl-[42px]"
                                    placeholder="Ad Soyad"
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center pointer-events-none">
                                    <User className="w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Email *</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field !pl-[42px]"
                                    placeholder="mail@unvan.az"
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center pointer-events-none">
                                    <Mail className="w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Şifrə *</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field !pl-[42px] tracking-widest"
                                    placeholder="••••••••"
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="glow-btn w-full py-2.5 mt-4 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>Hesab Yarat <ArrowRight className="w-3.5 h-3.5" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center text-sm">
                        <span className="text-[var(--text-secondary)]">Təkrar istifadəçi? </span>
                        <Link href="/login" className="text-white hover:underline underline-offset-4">
                            Giriş edin
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
