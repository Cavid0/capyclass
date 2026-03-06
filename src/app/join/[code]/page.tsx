"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LogIn, UserPlus, Code2, AlertTriangle, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

export default function JoinPage({ params }: { params: { code: string } }) {
    const { status } = useSession();
    const router = useRouter();
    const inviteCode = params.code as string;

    const [, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Handle auto-join if user is already logged in (Student)
    useEffect(() => {
        if (status === "authenticated" && inviteCode) {
            handleJoin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, inviteCode]);

    const handleJoin = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/classrooms/${inviteCode}/join`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                router.push(`/classroom/${data.classroomId}`);
            } else {
                setError(data.error || "An error occurred");
            }
        } catch {
            setError("Connection error");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-black flex justify-center items-center">
                <div className="spinner flex-shrink-0" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
            <Navbar />

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />

            <div className="flex-1 flex items-center justify-center p-6 z-10">
                <div className="glass-card w-full max-w-md p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-6">
                        <Code2 className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Join Classroom</h1>
                    <p className="text-[var(--text-secondary)] text-sm mb-8">
                        Invite code: <span className="font-mono bg-[var(--bg-secondary)] text-white px-2 py-1 rounded ml-1 border border-[var(--border-color)]">{inviteCode}</span>
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-md bg-rose-900/10 border border-rose-900/30 flex items-start gap-3 text-rose-400 text-sm text-left">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {status === "unauthenticated" ? (
                        <div className="space-y-4">
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Log in to your account or create a new one to join the classroom and work on tasks.
                            </p>

                            <Link href={`/login?callbackUrl=/join/${inviteCode}`} className="block">
                                <button className="glow-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                                    <LogIn className="w-4 h-4" /> Log In <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </Link>

                            <Link href={`/register?callbackUrl=/join/${inviteCode}`} className="block">
                                <button className="secondary-btn w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                                    <UserPlus className="w-4 h-4" /> Create New Account
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <div className="py-6 flex flex-col items-center">
                            <div className="spinner !w-6 !h-6 mb-4" />
                            <p className="text-sm text-[var(--text-secondary)]">Joining the classroom, please wait...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
