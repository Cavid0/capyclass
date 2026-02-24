"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Search, Users, Copy, Check, Clock, Code2, AlertCircle, UserPlus, ArrowRight, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState("");
    const [creating, setCreating] = useState(false);

    // Copy state
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        if (status === "authenticated") fetchClassrooms();
    }, [status]);

    const fetchClassrooms = async () => {
        try {
            const res = await fetch("/api/classrooms");
            const data = await res.json();
            if (Array.isArray(data)) {
                setClassrooms(data);
            } else {
                setClassrooms([]);
            }
        } catch (error) {
            console.error(error);
            setClassrooms([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName.trim()) return;

        setCreating(true);
        try {
            const res = await fetch("/api/classrooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newClassName }),
            });

            if (res.ok) {
                setNewClassName("");
                setShowCreateModal(false);
                fetchClassrooms();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        setJoining(true);
        setJoinError("");
        try {
            const res = await fetch(`/api/classrooms/${joinCode.trim()}/join`, {
                method: "POST",
            });
            const data = await res.json();

            if (res.ok) {
                setJoinCode("");
                setShowJoinModal(false);
                fetchClassrooms();
            } else {
                setJoinError(data.error || "Xəta baş verdi");
            }
        } catch {
            setJoinError("Bağlantı xətası");
        } finally {
            setJoining(false);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Derived state
    const isTeacher = (session?.user as any)?.role === "TEACHER";
    const filteredClasses = (classrooms || []).filter(c =>
        (c.name || c.classroom?.name || "").toLowerCase().includes(search.toLowerCase())
    );

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white mb-1">
                            {isTeacher ? "Sinifləriniz" : "Dərsləriniz"}
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm">
                            {isTeacher ? "Yeni sinif yaradın və idarə edin" : "Qoşulduğunuz dərslər və tapşırıqlar"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Axtarış..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field pl-9 block w-full bg-[var(--bg-card)] border-[var(--border-color)] focus:border-white focus:bg-[var(--bg-card)]"
                            />
                        </div>

                        {isTeacher ? (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="glow-btn px-4 py-[11px] h-[40px] flex items-center gap-2 whitespace-nowrap text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Yeni Sinif</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowJoinModal(true)}
                                className="glow-btn px-4 py-[11px] h-[40px] flex items-center gap-2 whitespace-nowrap text-sm"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden sm:inline">Sinfə Qoşul</span>
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="spinner" />
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="glass-card p-12 flex flex-col items-center justify-center text-center border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <div className="w-12 h-12 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] mb-4 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-[var(--text-secondary)]" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2 tracking-tight">
                            {search ? "Nəticə tapılmadı" : "Heç bir sinif yoxdur"}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm max-w-sm mb-6">
                            {isTeacher
                                ? "Başlamaq üçün yeni bir sinif yaradın və tələbələrinizi dəvət edin."
                                : "Müəlliminizin verdiyi dəvət kodu ilə bir sinfə qoşulun."}
                        </p>
                        {isTeacher && !search && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="glow-btn px-4 py-2 text-sm flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> İlk Sinfinizi Yaradın
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClasses.map((item) => {
                            const title = item.name;

                            return (
                                <div key={item.id} className="glass-card flex flex-col group hover:shadow-lg transition-all">
                                    <div className="p-5 flex-1 border-b border-[var(--border-color)]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center text-white">
                                                <Code2 className="w-5 h-5" />
                                            </div>

                                            {!isTeacher && (
                                                <span className={cn(
                                                    "status-badge",
                                                    item.status === "PASS" ? "text-emerald-400 border-emerald-900/50 bg-emerald-900/20" :
                                                        item.status === "FAIL" ? "text-rose-400 border-rose-900/50 bg-rose-900/20" :
                                                            "text-[var(--text-secondary)]"
                                                )}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-medium text-white tracking-tight mb-2 truncate">
                                            {title}
                                        </h3>

                                        {isTeacher ? (
                                            <div className="flex flex-col gap-2 mt-4 text-xs text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5" />
                                                    <span>{item._count?.enrollments || 0} tələbə</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Tarix: {new Date(item.createdAt).toLocaleDateString('az-AZ')}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 text-xs text-[var(--text-secondary)]">
                                                Müəllim: {item.teacherName || "Bilinmir"}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 bg-[var(--bg-secondary)] flex items-center justify-between gap-3 text-sm rounded-b-lg">
                                        {isTeacher && item.inviteCode ? (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    copyToClipboard(item.inviteCode!);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-hover)] transition-colors text-xs"
                                            >
                                                {copiedCode === item.inviteCode ? (
                                                    <><Check className="w-3.5 h-3.5 text-emerald-500" /> Kopyalandı</>
                                                ) : (
                                                    <><Copy className="w-3.5 h-3.5" /> Dəvət: <b>{item.inviteCode}</b></>
                                                )}
                                            </button>
                                        ) : <div />}

                                        <Link href={`/classroom/${item.id}`}>
                                            <button className="secondary-btn px-4 py-1.5 text-xs">
                                                Daxil ol
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
                    <div className="glass-card w-full max-w-md p-6 relative">
                        <h2 className="text-lg font-medium text-white mb-2 tracking-tight">Yeni Sinif</h2>
                        <p className="text-[var(--text-secondary)] text-sm mb-6">
                            Sinif yaradın və tələbələrə tapşırıq vermək üçün dəvət kodu generasiya edin.
                        </p>

                        <form onSubmit={handleCreate} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Sinfin Adı
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="input-field"
                                    placeholder="Məs: Python - Qrup 12"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    Ləğv et
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newClassName.trim()}
                                    className="glow-btn px-4 py-2 text-sm flex items-center justify-center gap-2 min-w-[100px]"
                                >
                                    {creating ? <div className="spinner !w-4 !h-4" /> : "Yarat"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Modal (Student) */}
            {showJoinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
                    <div className="glass-card w-full max-w-md p-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-5">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-lg font-medium text-white mb-2 tracking-tight text-center">Sinfə Qoşul</h2>
                        <p className="text-[var(--text-secondary)] text-sm mb-6 text-center">
                            Müəlliminizdən aldığınız dəvət kodunu daxil edin
                        </p>

                        {joinError && (
                            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{joinError}</span>
                            </div>
                        )}

                        <form onSubmit={handleJoin} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                    Dəvət Kodu
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    className="input-field text-center font-mono text-lg tracking-[0.3em] uppercase"
                                    placeholder="ABC123"
                                    maxLength={10}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowJoinModal(false); setJoinError(""); setJoinCode(""); }}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    Ləğv et
                                </button>
                                <button
                                    type="submit"
                                    disabled={joining || !joinCode.trim()}
                                    className="glow-btn px-4 py-2 text-sm flex items-center justify-center gap-2 min-w-[120px]"
                                >
                                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Qoşul</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
