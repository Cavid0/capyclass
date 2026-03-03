"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { User } from "lucide-react";

export function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
                {/* Logo */}
                <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                        <Image src="/capybara.png" alt="CapyClass" width={28} height={28} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                        CapyClass
                    </span>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {session ? (
                        <>
                            <Link href="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-colors cursor-pointer">
                                <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                <span className="text-xs text-[var(--text-primary)]">{session.user?.name}</span>
                            </Link>
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--border-color)]"
                                title="Çıxış"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <button className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
