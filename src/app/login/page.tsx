"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

function LoginForm() {
    const router = useRouter();
    const { status } = useSession();
    const searchParams = useSearchParams();
    const verified = searchParams.get("verified") === "true";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showVerified, setShowVerified] = useState(verified);

    useEffect(() => {
        if (verified) {
            const t = setTimeout(() => setShowVerified(false), 3500);
            return () => clearTimeout(t);
        }
    }, [verified]);

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
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                setError(res.error);
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 relative overflow-hidden">
            {/* Background decoration */}
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
                    <div className="mb-6">
                        <h1 className="text-xl font-semibold text-white tracking-tight mb-1">Log In</h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            Enter your credentials to access the system
                        </p>
                    </div>

                    {showVerified && (
                        <div className="mb-5 p-3 rounded-md bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400 text-sm transition-opacity duration-500">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                            <span>Email verified! You can now log in.</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex flex-col items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center pointer-events-none">
                                    <Mail className="w-4 h-4 text-[#71717a]" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--text-secondary)]">Password *</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
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
                            className="glow-btn w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>Log In <ArrowRight className="w-3.5 h-3.5" /></>
                            )}
                        </button>

                        <div className="text-center mt-3">
                            <Link href="/forgot-password" className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors underline underline-offset-4">
                                Forgot Password
                            </Link>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center text-sm">
                        <span className="text-[var(--text-secondary)]">Don’t have an account? </span>
                        <Link href="/register" className="text-white hover:underline underline-offset-4">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <LoginForm />
        </Suspense>
    );
}
