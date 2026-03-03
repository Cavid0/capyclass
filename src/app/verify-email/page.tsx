"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Token tapılmadı.");
            return;
        }

        fetch(`/api/auth/verify-email?token=${token}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    setStatus("error");
                    setMessage(data.error);
                } else {
                    setStatus("success");
                    setMessage(data.message || "Email uğurla təsdiqləndi!");
                    setTimeout(() => router.push("/login"), 3000);
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("Xəta baş verdi. Yenidən cəhd edin.");
            });
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-600/[0.04] blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-sm z-10">
                <div className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                            <Image src="/capybara.png" alt="CapyClass" width={32} height={32} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">CapyClass</span>
                    </Link>
                </div>

                <div className="glass-card p-8 text-center">
                    {status === "loading" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <Loader2 className="w-12 h-12 text-white animate-spin" />
                            </div>
                            <h1 className="text-lg font-semibold text-white mb-2">Yoxlanılır...</h1>
                            <p className="text-[var(--text-secondary)] text-sm">
                                Email ünvanınız təsdiqlənir, zəhmət olmasa gözləyin.
                            </p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <CheckCircle2 className="w-12 h-12 text-green-400" />
                            </div>
                            <h1 className="text-lg font-semibold text-white mb-2">Təsdiqləndi!</h1>
                            <p className="text-[var(--text-secondary)] text-sm mb-6">
                                {message}
                            </p>
                            <p className="text-[var(--text-secondary)] text-xs mb-4">
                                3 saniyə ərzində giriş səhifəsinə yönləndiriləcəksiniz...
                            </p>
                            <Link
                                href="/login"
                                className="inline-block w-full py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors text-center"
                            >
                                Daxil ol
                            </Link>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="flex justify-center mb-4">
                                <XCircle className="w-12 h-12 text-red-400" />
                            </div>
                            <h1 className="text-lg font-semibold text-white mb-2">Xəta baş verdi</h1>
                            <p className="text-[var(--text-secondary)] text-sm mb-6">
                                {message}
                            </p>
                            <Link
                                href="/register"
                                className="inline-block w-full py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors text-center"
                            >
                                Yenidən qeydiyyat
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
