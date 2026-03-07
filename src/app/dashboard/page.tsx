"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Search, Users, Copy, Check, Clock, Code2, AlertCircle, UserPlus, ArrowRight, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const userName = session?.user?.name?.split(' ')[0] || "User";
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
                setJoinError(data.error || "An error occurred");
            }
        } catch {
            setJoinError("Connection error");
        } finally {
            setJoining(false);
        }
    };

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleDeleteClassroom = async (classroomId: string) => {
        toast("Are you sure you want to delete this classroom?", {
            description: "All tasks and student files will be deleted.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroomId}`, {
                            method: "DELETE"
                        });
                        if (res.ok) {
                            fetchClassrooms();
                            toast.success("Classroom deleted");
                        } else {
                            toast.error("Error deleting classroom");
                        }
                    } catch (error) {
                        console.error("Delete classroom timeout/error", error);
                    }
                }
            },
            cancel: {
                label: "Cancel",
                onClick: () => { }
            }
        });
    };

    const filteredClasses = (classrooms || []).filter(c =>
        (c.name || "").toLowerCase().includes(search.toLowerCase())
    );

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <Navbar />

            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                            Hello, {userName}! 👋
                        </h1>
                        <p className="text-[var(--text-secondary)] text-base max-w-lg">
                            Easily manage your classrooms, create new courses, and complete assignments.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72 group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field !pl-[42px] !pr-4 !bg-[var(--bg-card)]/50 backdrop-blur-sm !border-white/5 !shadow-inner focus:!border-indigo-500/50 hover:!border-white/10"
                            />
                        </div>

                        <button
                            onClick={() => setShowJoinModal(true)}
                            className="glow-btn !bg-white/5 !border-white/10 !text-white hover:!bg-white/10 px-5 py-[11px] h-[40px] flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium hover:scale-105 transition-transform"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Join Class</span>
                        </button>

                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="glow-btn px-5 py-[11px] h-[40px] flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium hover:scale-105 transition-transform"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Class</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="spinner" />
                    </div>
                ) : filteredClasses.length === 0 ? (
                    <div className="glass-card p-14 flex flex-col items-center justify-center text-center border-dashed border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-secondary)] to-transparent rounded-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative z-10 mb-6">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-2xl rounded-full pointer-events-none" />
                                <Image
                                    src="/capybara.png"
                                    alt="Capybara mascot"
                                    width={240}
                                    height={135}
                                    className="rounded-2xl mx-auto opacity-85 group-hover:opacity-100 transition-opacity relative z-10 border border-amber-500/10"
                                />
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-3 tracking-tight relative z-10">
                            {search ? "No results found" : "No classrooms found"}
                        </h3>
                        <p className="text-[var(--text-secondary)] text-sm max-w-md mb-8 relative z-10 leading-relaxed">
                            Create a class for your students or join an existing one to get started.
                        </p>
                        {!search && (
                            <div className="flex items-center gap-4 relative z-10">
                                <button
                                    onClick={() => setShowJoinModal(true)}
                                    className="glow-btn !bg-white/5 !border-white/10 !text-white hover:!bg-white/10 px-6 py-2.5 text-sm font-medium flex items-center gap-2.5 hover:scale-105 transition-transform"
                                >
                                    <UserPlus className="w-4 h-4" /> Join Class
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="glow-btn px-6 py-2.5 text-sm font-medium flex items-center gap-2.5 hover:scale-105 transition-transform"
                                >
                                    <Plus className="w-4 h-4" /> Create Class
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClasses.map((item) => {
                            const title = item.name;

                            return (
                                <div key={item.id} className="glass-card flex flex-col group hover:shadow-2xl hover:border-white/20 transition-all duration-300 relative overflow-hidden bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)]">
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <div className="p-6 flex-1 border-b border-[var(--border-color)] relative z-10">
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform duration-300">
                                                <Code2 className="w-6 h-6 text-indigo-400" />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!item.isTeacher && (
                                                    <span className={cn(
                                                        "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border shadow-sm",
                                                        item.status === "PASS" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                                            item.status === "FAIL" ? "text-rose-400 border-rose-500/30 bg-rose-500/10" :
                                                                "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
                                                    )}>
                                                        {item.status || "ACTIVE"}
                                                    </span>
                                                )}
                                                {item.isTeacher && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleDeleteClassroom(item.id); }}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-transparent hover:border-red-500/30 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 relative z-20"
                                                        title="Delete Classroom"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-semibold text-white tracking-tight mb-2 truncate group-hover:text-indigo-200 transition-colors">
                                            {title}
                                        </h3>

                                        {item.isTeacher ? (
                                            <div className="flex flex-col gap-2.5 mt-5 text-sm text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-2.5 bg-white/5 rounded-md px-3 py-2 border border-white/5">
                                                    <Users className="w-4 h-4 text-blue-400" />
                                                    <span className="font-medium text-gray-300">{item._count?.enrollments || 0} Students</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 px-3 py-1">
                                                    <Clock className="w-4 h-4 opacity-70" />
                                                    <span className="text-xs">Created: {new Date(item.createdAt).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-5 text-sm text-[var(--text-secondary)] flex items-center gap-2 bg-white/5 rounded-md px-3 py-2 border border-white/5">
                                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-indigo-300">A</span>
                                                </div>
                                                Admin: <span className="text-gray-300 font-medium">{item.teacherName || "Unknown"}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-[var(--bg-card)]/50 backdrop-blur-sm flex items-center justify-between gap-3 text-sm rounded-b-xl border-t border-white/5 relative z-10">
                                        {item.isTeacher && item.inviteCode ? (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    copyToClipboard(item.inviteCode!);
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition-all text-xs font-medium group/copy"
                                                title="Copy invite code for students"
                                            >
                                                {copiedCode === item.inviteCode ? (
                                                    <><Check className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-400 hidden sm:inline">Copied</span></>
                                                ) : (
                                                    <><Copy className="w-4 h-4 group-hover/copy:scale-110 transition-transform" /> <span className="font-mono tracking-wider text-gray-300">{item.inviteCode}</span></>
                                                )}
                                            </button>
                                        ) : <div />}

                                        <Link href={`/classroom/${item.id}`}>
                                            <button className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors text-xs font-medium border border-white/10 hover:border-white/30">
                                                Enter <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </main >

            {/* Create Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
                        <div className="glass-card w-full max-w-md p-6 relative">
                            <h2 className="text-lg font-medium text-white mb-2 tracking-tight">New Class</h2>
                            <p className="text-[var(--text-secondary)] text-sm mb-6">
                                Create a class and generate an invite code for your students.
                            </p>

                            <form onSubmit={handleCreate} className="space-y-4 text-left">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                                        Class Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={newClassName}
                                        onChange={(e) => setNewClassName(e.target.value)}
                                        className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hover:border-white/20 transition-all duration-200 shadow-inner"
                                        placeholder="e.g. Python - Group 12"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating || !newClassName.trim()}
                                        className="glow-btn px-4 py-2 text-sm flex items-center justify-center gap-2 min-w-[100px]"
                                    >
                                        {creating ? <div className="spinner !w-4 !h-4" /> : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Join Modal (Student) */}
            {
                showJoinModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
                        <div className="glass-card w-full max-w-md p-6 relative">
                            <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-5">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-lg font-medium text-white mb-2 tracking-tight text-center">Join Class</h2>
                            <p className="text-[var(--text-secondary)] text-sm mb-6 text-center">
                                Enter the invite code from your teacher
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
                                        Invite Code
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-2xl px-4 py-4 text-center text-white placeholder-white/10 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 hover:border-white/20 transition-all duration-200 font-mono text-2xl tracking-[0.25em] uppercase shadow-inner"
                                            placeholder="ABC123"
                                            maxLength={10}
                                        />
                                        <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5"></div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => { setShowJoinModal(false); setJoinError(""); setJoinCode(""); }}
                                        className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={joining || !joinCode.trim()}
                                        className="glow-btn px-4 py-2 text-sm flex items-center justify-center gap-2 min-w-[120px]"
                                    >
                                        {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Join</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
