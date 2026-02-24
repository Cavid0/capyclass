"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Code2, LayoutDashboard, User } from "lucide-react";

export function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-black/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-6 h-6 border border-white/20 bg-white/5 rounded flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Code2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white tracking-tight">
                        ClassFlow
                    </span>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {session ? (
                        <>
                            <Link href="/dashboard">
                                <button className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] transition-colors text-xs text-[var(--text-secondary)] hover:text-white">
                                    <LayoutDashboard className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Panel</span>
                                </button>
                            </Link>
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                <span className="text-xs text-white">{session.user?.name}</span>
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider px-1">
                                    {(session.user as any)?.role === "TEACHER" ? "M.L.M" : "TƏL"}
                                </span>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white transition-colors border border-transparent hover:border-[var(--border-color)]"
                                title="Çıxış"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <button className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
                                    Giriş
                                </button>
                            </Link>
                            <Link href="/register">
                                <button className="glow-btn px-4 py-1.5 text-xs font-medium">
                                    Qeydiyyat
                                </button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
