"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
    Users, Code2, ChevronLeft, RefreshCw, Plus, ClipboardList, Clock, FileCode, Save, Send, Folder, Loader2, CheckCircle, Bell, ThumbsUp, ThumbsDown, MessageSquare, XCircle, ChevronDown, Play, Terminal, X, Edit2, Trash2
} from "lucide-react";
import Link from "next/link";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClassroomPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const [classroom, setClassroom] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchClassroom = useCallback(async (isPolling = false) => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}`, { cache: "no-store" });
            if (!res.ok) {
                if (res.status === 403 || res.status === 404) router.push("/dashboard");
                return;
            }
            const data = await res.json();
            setClassroom({
                ...data.classroom,
                workspaces: data.workspaces || [],
                enrollments: data.enrollments || [],
            });
            // If student and no workspace selected, select first one if exists
            if (data.workspaces && data.workspaces.length > 0 && !selectedWorkspaceId && data.classroom?.teacherId !== (session?.user as any)?.id) {
                setSelectedWorkspaceId(data.workspaces[0].id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [params.id, router, selectedWorkspaceId, session]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}/tasks`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setTasks(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, [params.id]);

    useEffect(() => {
        if (status === "authenticated") {
            fetchClassroom();
            fetchTasks();
        }
    }, [status, fetchClassroom, fetchTasks]);

    // Auto-poll every 5 seconds for teacher
    useEffect(() => {
        if (status === "authenticated" && classroom && classroom.teacherId === (session?.user as any)?.id) {
            intervalRef.current = setInterval(() => {
                fetchClassroom(true);
            }, 5000);
            return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
        }
    }, [status, session, fetchClassroom]);

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex justify-center items-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!classroom) return null;

    const isTeacher = classroom.teacherId === (session?.user as any)?.id;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            {/* Topbar */}
            <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-6 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </Link>
                    <div className="h-4 w-px bg-[var(--border-color)]" />
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center">
                            <Code2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <h1 className="text-sm font-semibold tracking-tight text-white">{classroom.name}</h1>
                    </div>
                </div>

                {isTeacher && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            CANLI
                        </div>
                        <button
                            onClick={() => fetchClassroom(true)}
                            title="Yenilə"
                            className="p-1.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <div className="h-4 w-px bg-[var(--border-color)]" />
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{classroom.enrollments?.length || 0} tələbə</span>
                        </div>
                        <div className="h-4 w-px bg-[var(--border-color)]" />
                        <div className="text-xs font-mono bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-1 rounded">
                            Kod: <span className="text-white">{classroom.inviteCode}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {isTeacher ? (
                    <TeacherView
                        classroom={classroom}
                        tasks={tasks}
                        selectedWorkspaceId={selectedWorkspaceId}
                        onSelectWorkspace={setSelectedWorkspaceId}
                        onTaskCreated={fetchTasks}
                        onRefresh={fetchClassroom}
                    />
                ) : (
                    <StudentView
                        classroomId={classroom.id}
                        workspaces={classroom.workspaces || []}
                        tasks={tasks}
                        selectedWorkspaceId={selectedWorkspaceId}
                        onSelectWorkspace={setSelectedWorkspaceId}
                        onWorkspaceCreated={fetchClassroom}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================
// TEACHER VIEW
// =============================================================
function TeacherView({ classroom, tasks, selectedWorkspaceId, onSelectWorkspace, onTaskCreated, onRefresh }: any) {
    const workspaces = classroom.workspaces || [];
    const enrollments = classroom.enrollments || [];

    const activeWorkspaceData = workspaces.find((w: any) => w.id === selectedWorkspaceId);

    const [activeTab, setActiveTab] = useState<"students" | "tasks">("students");
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [creatingTask, setCreatingTask] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    const openCreateTask = () => {
        setEditingTaskId(null);
        setTaskTitle("");
        setTaskDesc("");
        setShowTaskModal(true);
    };

    const openEditTask = (t: any) => {
        setEditingTaskId(t.id);
        setTaskTitle(t.title);
        setTaskDesc(t.description || "");
        setShowTaskModal(true);
    };

    // Review system
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [viewingTask, setViewingTask] = useState<any>(null);

    // Compiler state
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [outputError, setOutputError] = useState(false);
    const [showOutput, setShowOutput] = useState(false);

    const handleRun = async () => {
        if (!activeWorkspaceData) return;
        if (!activeWorkspaceData.code.trim() || activeWorkspaceData.language === "html") return;
        setRunning(true);
        setOutput(null);
        setOutputError(false);
        setShowOutput(true);
        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: activeWorkspaceData.code, language: activeWorkspaceData.language }),
            });
            const data = await res.json();
            if (res.ok) {
                setOutput(data.output || "(Çıxış yoxdur)");
                setOutputError(data.hasError);
            } else {
                setOutput(data.error || "Xəta baş verdi");
                setOutputError(true);
            }
        } catch (error) {
            setOutput("Şəbəkə xətası. Yenidən cəhd edin.");
            setOutputError(true);
        } finally {
            setRunning(false);
        }
    };

    // Notifications for when a student saves code
    const prevWorkspacesRef = useRef<any[]>([]);
    const [notifications, setNotifications] = useState<{ id: string, message: string, workspaceId: string }[]>([]);

    useEffect(() => {
        const prev = prevWorkspacesRef.current;
        if (prev.length > 0) {
            const newUpdates = workspaces.filter((w: any) => {
                const oldW = prev.find((p: any) => p.id === w.id);
                // Notification triggers if updatedAt timestamp changed
                return oldW && new Date(w.updatedAt).getTime() > new Date(oldW.updatedAt).getTime();
            });

            if (newUpdates.length > 0) {
                const newNotifs = newUpdates.map((w: any) => ({
                    id: Math.random().toString(),
                    message: `${w.student.name} "${w.title}" faylını yadda saxladı`,
                    workspaceId: w.id
                }));

                setNotifications(prevNotifs => [...prevNotifs, ...newNotifs]);

                setTimeout(() => {
                    setNotifications(prevNotifs => prevNotifs.filter(n => !newNotifs.find((nn: any) => nn.id === n.id)));
                }, 5000);
            }
        }
        prevWorkspacesRef.current = workspaces;
    }, [workspaces]);

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        setCreatingTask(true);
        try {
            const url = editingTaskId
                ? `/api/tasks/${editingTaskId}`
                : `/api/classrooms/${classroom.id}/tasks`;
            const method = editingTaskId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: taskTitle, description: taskDesc }),
            });
            if (res.ok) {
                setShowTaskModal(false);
                setTaskTitle("");
                setTaskDesc("");
                setEditingTaskId(null);
                onTaskCreated();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreatingTask(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        toast("Bu tapşırığı silmək istədiyinizə əminsiniz?", {
            action: {
                label: "Bəli, Sil",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
                        if (res.ok) {
                            if (viewingTask?.id === taskId) setViewingTask(null);
                            onTaskCreated(); // refresh tasks
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        });
    };

    const handleRemoveStudent = async (studentId: string) => {
        toast("Bu tələbəni sinifdən silmək istədiyinizə əminsiniz?", {
            description: "Onların yaratdığı fayllar da silinəcək.",
            action: {
                label: "Bəli, Sil",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroom.id}/enrollments/${studentId}`, { method: "DELETE" });
                        if (res.ok) {
                            onRefresh();
                        } else {
                            toast.error("Xəta baş verdi");
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        });
    };

    const handleTransferAdmin = async (studentId: string) => {
        toast("Admin hüquqlarını bu tələbəyə vermək istədiyinizə əminsiniz?", {
            description: "Siz artıq bu sinfin admini olmayacaqsınız.",
            action: {
                label: "Bəli",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroom.id}/transfer`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ newTeacherId: studentId })
                        });
                        if (res.ok) {
                            window.location.reload(); // Reload context to become student view
                        } else {
                            const data = await res.json();
                            toast.error(data.error || "Xəta baş verdi");
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        });
    };

    const handleReview = async (workspaceId: string, status: "CORRECT" | "INCORRECT") => {
        setSubmittingReview(true);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reviewStatus: status, reviewNote }),
            });
            if (res.ok) {
                setReviewNote("");
                setReviewingId(null);
                onRefresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSubmittingReview(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row bg-[var(--bg-primary)]" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {/* Sidebar */}
            <div className={cn(
                "w-full md:w-80 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--bg-secondary)] shrink-0 transition-all",
                selectedWorkspaceId ? "hidden md:flex" : "flex"
            )}>
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)]">
                    <button
                        onClick={() => setActiveTab("students")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "students"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Tələbələr ({enrollments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "tasks"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tapşırıqlar ({tasks.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === "students" ? (
                        <div className="p-2 space-y-2">
                            {enrollments.length === 0 ? (
                                <div className="text-center p-6 text-[var(--text-secondary)] text-sm">
                                    Sinfə hələ heç kim qoşulmayıb
                                </div>
                            ) : (
                                enrollments.map((en: any) => {
                                    const studentWorkspaces = workspaces.filter((w: any) => w.studentId === en.studentId);
                                    const isExpanded = expandedStudent === en.studentId;

                                    return (
                                        <div key={en.id} className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
                                            <div
                                                className="w-full text-left p-3 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group"
                                            >
                                                <button
                                                    onClick={() => setExpandedStudent(isExpanded ? null : en.studentId)}
                                                    className="flex items-center gap-2 flex-1"
                                                >
                                                    <div className="w-6 h-6 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-white">
                                                        {en.student.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-white">
                                                        {en.student.name}
                                                    </span>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded pointer-events-none">
                                                        {studentWorkspaces.length} fayl
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleTransferAdmin(en.studentId); }}
                                                        className="h-7 px-2 rounded flex items-center justify-center text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-all border border-blue-500/20"
                                                        title="Admin hüquqlarını ver"
                                                    >
                                                        Admin Et
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveStudent(en.studentId); }}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/30"
                                                        title="Tələbəni sinifdən sil"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 space-y-1">
                                                    {studentWorkspaces.length === 0 ? (
                                                        <div className="text-xs text-[var(--text-secondary)] p-2 text-center">
                                                            Hələ fayl yaradılmayıb
                                                        </div>
                                                    ) : (
                                                        studentWorkspaces.map((w: any) => {
                                                            const wasSaved = new Date(w.updatedAt).getTime() - new Date(w.createdAt).getTime() > 1000;
                                                            return (
                                                                <button
                                                                    key={w.id}
                                                                    onClick={() => onSelectWorkspace(w.id)}
                                                                    className={cn(
                                                                        "w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between",
                                                                        selectedWorkspaceId === w.id
                                                                            ? "bg-[var(--bg-card)] border border-[var(--border-color)] text-white shadow-sm"
                                                                            : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] border border-transparent"
                                                                    )}
                                                                >
                                                                    <span className="flex items-center gap-1.5 truncate">
                                                                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                                                                        <span className="truncate">{w.title}</span>
                                                                        {wasSaved && (
                                                                            <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                                                <CheckCircle className="w-2.5 h-2.5" />
                                                                                Göndərilib
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-[9px] opacity-70 ml-2 shrink-0">
                                                                        {new Date(w.updatedAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            <button
                                onClick={openCreateTask}
                                className="w-full p-3 rounded-lg border border-dashed border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-hover)] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Yeni Tapşırıq
                            </button>

                            {tasks.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                                    Hələ tapşırıq yoxdur
                                </div>
                            ) : (
                                tasks.map((t: any) => (
                                    <div key={t.id} onClick={() => setViewingTask(t)} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)] transition-all group">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-medium text-white">{t.title}</h4>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openEditTask(t)}
                                                    className="p-1 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all"
                                                    title="Redaktə et"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTask(t.id)}
                                                    className="p-1 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        {t.description && (
                                            <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{t.description}</p>
                                        )}
                                        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(t.createdAt).toLocaleDateString('az-AZ')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
                {selectedWorkspaceId && activeWorkspaceData ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-4 px-4 shrink-0">
                            <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)] hover:text-white">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-medium">{activeWorkspaceData.student.name}</span>
                                <span className="text-[var(--text-secondary)]">/</span>
                                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-0.5 rounded">
                                    <FileCode className="w-3.5 h-3.5" />
                                    {activeWorkspaceData.title}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 bg-[#0d1117] relative min-h-0 flex flex-col">
                            <div className="flex-1 relative min-h-0">
                                <div className="absolute top-2 right-4 z-10 flex gap-2">
                                    <div className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded-md text-[10px] text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70"></span>
                                        Yalnız oxu
                                    </div>
                                    {activeWorkspaceData.language !== "html" && (
                                        <button onClick={handleRun} disabled={running} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                                            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                            İcra et
                                        </button>
                                    )}
                                </div>
                                <CodeEditor
                                    key={`${activeWorkspaceData.id}-${activeWorkspaceData.updatedAt}`}
                                    language={activeWorkspaceData.language}
                                    value={activeWorkspaceData.code}
                                    readOnly
                                />
                            </div>

                            {/* Output Panel for Teacher */}
                            {showOutput && (
                                <div className="h-48 border-t border-[#30363d] bg-[#0d1117] flex flex-col shrink-0">
                                    <div className="h-8 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between px-4 shrink-0">
                                        <div className="flex items-center gap-2 text-[#8b949e]">
                                            <Terminal className="w-3.5 h-3.5" />
                                            <span className="text-xs font-medium uppercase tracking-wider">Terminal</span>
                                        </div>
                                        <button onClick={() => setShowOutput(false)} className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                        {running ? (
                                            <div className="flex items-center gap-3 text-[#8b949e] text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Proqram icra edilir...</span>
                                            </div>
                                        ) : (
                                            <pre className={cn(
                                                "text-sm font-mono whitespace-pre-wrap",
                                                outputError ? "text-red-400" : "text-[#e6edf3]"
                                            )}>
                                                {output}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Review Panel */}
                        <div className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                            {activeWorkspaceData.reviewStatus ? (
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border",
                                    activeWorkspaceData.reviewStatus === "CORRECT"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                )}>
                                    {activeWorkspaceData.reviewStatus === "CORRECT" ? (
                                        <ThumbsUp className="w-5 h-5 shrink-0" />
                                    ) : (
                                        <ThumbsDown className="w-5 h-5 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                            {activeWorkspaceData.reviewStatus === "CORRECT" ? "Düzdür ✓" : "Səhvdir ✗"}
                                        </p>
                                        {activeWorkspaceData.reviewNote && (
                                            <p className="text-xs mt-1 opacity-80">{activeWorkspaceData.reviewNote}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setReviewingId(activeWorkspaceData.id)}
                                        className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                                    >
                                        Dəyiş
                                    </button>
                                </div>
                            ) : null}

                            {(!activeWorkspaceData.reviewStatus || reviewingId === activeWorkspaceData.id) && (
                                <div className="space-y-3">
                                    {!activeWorkspaceData.reviewStatus && (
                                        <p className="text-xs text-[var(--text-secondary)]">Bu faylı dəyərləndir:</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={reviewNote}
                                            onChange={e => setReviewNote(e.target.value)}
                                            className="input-field flex-1 text-sm"
                                            placeholder="Qeyd (ixtiyari)..."
                                        />
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "CORRECT")}
                                            disabled={submittingReview}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                                            Düzdü
                                        </button>
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "INCORRECT")}
                                            disabled={submittingReview}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                                            Səhvdi
                                        </button>
                                        {reviewingId && (
                                            <button
                                                onClick={() => { setReviewingId(null); setReviewNote(""); }}
                                                className="p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <Folder className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Ətraflı baxmaq üçün soldan tələbənin faylını seçin</p>
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTaskModal(false)}>
                    <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{editingTaskId ? "Tapşırığı Yenilə" : "Yeni Tapşırıq"}</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Bütün tələbələr bu tapşırığı görəcək</p>
                            </div>
                        </div>

                        <form onSubmit={handleTaskSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Başlıq *</label>
                                    <input
                                        type="text"
                                        value={taskTitle}
                                        onChange={e => setTaskTitle(e.target.value)}
                                        className="input-field"
                                        placeholder="Məs: Fibonacci ardıcıllığını yazın"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Təsvir (ixtiyari)</label>
                                    <textarea
                                        value={taskDesc}
                                        onChange={e => setTaskDesc(e.target.value)}
                                        className="input-field min-h-[100px] resize-none"
                                        placeholder="Tapşırığın ətraflı təsviri..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowTaskModal(false); setEditingTaskId(null); }}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >Ləğv et</button>
                                <button
                                    type="submit"
                                    disabled={creatingTask || !taskTitle.trim()}
                                    className="glow-btn px-4 py-2 text-sm flex items-center gap-2"
                                >
                                    {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTaskId ? <><Save className="w-4 h-4" /> Yadda saxla</> : <><Send className="w-4 h-4" /> Göndər</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Task Modal */}
            {viewingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingTask(null)}>
                    <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-6 shrink-0 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{viewingTask.title}</h3>
                                    <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(viewingTask.createdAt).toLocaleDateString('az-AZ')}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-[var(--text-secondary)] hover:text-white transition-colors shrink-0 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pr-2">
                            {viewingTask.description || "Təsvir yoxdur"}
                            <div className="shrink-0 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { openEditTask(viewingTask); setViewingTask(null); }}
                                        className="p-2 text-[var(--text-secondary)] hover:text-blue-400 border border-transparent hover:border-blue-500/20 hover:bg-blue-500/10 rounded-md transition-all"
                                        title="Redaktə et"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(viewingTask.id)}
                                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 rounded-md transition-all"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                {notifications.map(n => (
                    <div
                        key={n.id}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] text-white text-sm px-4 py-3 rounded-lg shadow-xl cursor-pointer hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-3 animate-in slide-in-from-bottom-5"
                        onClick={() => onSelectWorkspace(n.workspaceId)}
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <Bell className="w-4 h-4" />
                        </div>
                        <p>{n.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================================
// STUDENT VIEW
// =============================================================
function StudentView({ classroomId, workspaces, tasks, selectedWorkspaceId, onSelectWorkspace, onWorkspaceCreated }: any) {
    const activeWorkspace = workspaces.find((w: any) => w.id === selectedWorkspaceId);

    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [activeTab, setActiveTab] = useState<"files" | "tasks">("tasks");
    const [creatingFile, setCreatingFile] = useState(false);
    const [viewingTask, setViewingTask] = useState<any>(null);

    // Compiler state
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [outputError, setOutputError] = useState(false);
    const [showOutput, setShowOutput] = useState(false);

    const [showNewFileModal, setShowNewFileModal] = useState(false);
    const [newFileName, setNewFileName] = useState("");

    // Sync editor when active workspace changes
    useEffect(() => {
        if (activeWorkspace) {
            setCode(activeWorkspace.code);
            setLanguage(activeWorkspace.language || "javascript");
        } else {
            setCode("");
        }
    }, [activeWorkspace?.id, activeWorkspace]);

    const submitCreateFile = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = newFileName.trim();
        if (!title) return;

        setShowNewFileModal(false);
        setNewFileName("");
        setCreatingFile(true);
        try {
            const res = await fetch(`/api/classrooms/${classroomId}/workspaces`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            if (res.ok) {
                const newWs = await res.json();
                onWorkspaceCreated();
                onSelectWorkspace(newWs.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreatingFile(false);
        }
    };

    const handleSave = async () => {
        if (!activeWorkspace) return;
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch(`/api/workspaces/${activeWorkspace.id}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
            onWorkspaceCreated(); // refresh data so sidebar stays in sync if needed
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!activeWorkspace) return;
        toast("Bu faylı silmək istədiyinizə əminsiniz?", {
            action: {
                label: "Bəli, Sil",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, { method: "DELETE" });
                        if (res.ok) {
                            onSelectWorkspace(null);
                            onWorkspaceCreated();
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        });
    };

    const handleRun = async () => {
        if (!code.trim() || language === "html") return;
        setRunning(true);
        setOutput(null);
        setOutputError(false);
        setShowOutput(true);
        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language }),
            });
            const data = await res.json();
            if (res.ok) {
                setOutput(data.output || "(Çıxış yoxdur)");
                setOutputError(data.hasError);
            } else {
                setOutput(data.error || "Xəta baş verdi");
                setOutputError(true);
            }
        } catch (error) {
            setOutput("Şəbəkə xətası. Yenidən cəhd edin.");
            setOutputError(true);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {/* Sidebar (Left side for student too, looks more like VS Code) */}
            <div className={cn(
                "w-full md:w-72 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--bg-secondary)] shrink-0 transition-all z-20",
                selectedWorkspaceId ? "hidden md:flex" : "flex"
            )}>
                <div className="flex border-b border-[var(--border-color)] shrink-0">
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "tasks"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tapşırıqlar
                    </button>
                    <button
                        onClick={() => setActiveTab("files")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "files"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <Folder className="w-3.5 h-3.5" />
                        Fayllarım
                    </button>
                </div>

                <div className="flex-1 bg-[var(--bg-primary)] overflow-y-auto custom-scrollbar">
                    {activeTab === "tasks" ? (
                        <div className="p-3 space-y-3">
                            {tasks.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Hələ tapşırıq yoxdur</p>
                                </div>
                            ) : (
                                tasks.map((t: any) => (
                                    <div key={t.id} onClick={() => setViewingTask(t)} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)] transition-all group">
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-medium text-white">{t.title}</h4>
                                        </div>
                                        {t.description && (
                                            <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{t.description}</p>
                                        )}
                                        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(t.createdAt).toLocaleDateString('az-AZ')}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setShowNewFileModal(true)}
                                disabled={creatingFile}
                                className="w-full text-left p-2 rounded-md hover:bg-[var(--bg-card)] text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center justify-center gap-2 border border-dashed border-[var(--border-color)] hover:border-[var(--border-hover)] mb-2"
                            >
                                {creatingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Yeni Fayl
                            </button>

                            {workspaces.map((w: any) => {
                                const hasReview = w.reviewStatus;
                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => onSelectWorkspace(w.id)}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-md text-sm transition-all flex items-center justify-between border",
                                            selectedWorkspaceId === w.id
                                                ? "bg-[var(--bg-card)] border-[var(--border-color)] text-white shadow-sm"
                                                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate">
                                            <FileCode className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{w.title}</span>
                                        </span>
                                        {hasReview && (
                                            <span className={cn(
                                                "text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0",
                                                w.reviewStatus === "CORRECT"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                            )}>
                                                {w.reviewStatus === "CORRECT" ? <ThumbsUp className="w-2.5 h-2.5" /> : <ThumbsDown className="w-2.5 h-2.5" />}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Pane */}
            <div className="flex-1 flex flex-col bg-[#0d1117] min-w-0 min-h-0">
                {activeWorkspace ? (
                    <>
                        <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-4 shrink-0 transition-all">
                            <div className="flex items-center gap-3">
                                <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)] mr-2">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="text-sm font-medium text-white flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 rounded">
                                    <FileCode className="w-3.5 h-3.5" />
                                    {activeWorkspace.title}
                                </div>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-transparent border-none text-[var(--text-secondary)] text-xs outline-none cursor-pointer hover:text-white"
                                >
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="python">Python</option>
                                    <option value="c">C</option>
                                    <option value="cpp">C++</option>
                                    <option value="csharp">C#</option>
                                    <option value="java">Java</option>
                                    <option value="go">Go</option>
                                    <option value="ruby">Ruby</option>
                                    <option value="php">PHP</option>
                                    <option value="rust">Rust</option>
                                    <option value="swift">Swift</option>
                                    <option value="kotlin">Kotlin</option>
                                    <option value="html">HTML/CSS</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={cn(
                                        "px-4 py-1.5 text-xs flex items-center gap-2 rounded transition-all",
                                        saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "glow-btn"
                                    )}
                                >
                                    {saving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : saved ? (
                                        <><CheckCircle className="w-3.5 h-3.5" /> Saxlandı</>
                                    ) : (
                                        <><Save className="w-3.5 h-3.5" /> Saxla</>
                                    )}
                                </button>

                                {language !== "html" && (
                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="px-4 py-1.5 text-xs flex items-center gap-2 rounded transition-all bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                                    >
                                        {running ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Play className="w-3.5 h-3.5" />
                                        )}
                                        Çalışdır
                                    </button>
                                )}

                                <button
                                    onClick={handleDeleteWorkspace}
                                    className="px-2 py-1.5 text-xs flex items-center gap-2 rounded transition-all bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                                    title="Faylı Sil"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className={cn("flex-1 relative min-h-0 flex flex-col", showOutput && "flex-[2]")}>
                            <div className="flex-1 relative min-h-0">
                                <CodeEditor
                                    value={code}
                                    onChange={(val) => setCode(val || "")}
                                    language={language}
                                />
                            </div>

                            {/* Output Panel */}
                            {showOutput && (
                                <div className="shrink-0 border-t border-[var(--border-color)] bg-[#010409] flex flex-col" style={{ height: '200px' }}>
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1117] border-b border-[var(--border-color)]">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Terminal className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                            <span className="text-[var(--text-secondary)] font-medium">Çıxış</span>
                                            {running && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                                        </div>
                                        <button
                                            onClick={() => { setShowOutput(false); setOutput(null); }}
                                            className="p-1 text-[var(--text-secondary)] hover:text-white transition-colors rounded hover:bg-white/5"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-auto p-3 custom-scrollbar">
                                        {running ? (
                                            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Kod icra edilir...
                                            </div>
                                        ) : output !== null ? (
                                            <pre className={cn(
                                                "text-xs font-mono whitespace-pre-wrap leading-relaxed",
                                                outputError ? "text-red-400" : "text-emerald-300"
                                            )}>{output}</pre>
                                        ) : (
                                            <p className="text-xs text-[var(--text-secondary)]">Çalışdırmaq üçün ▶ düyməsini basın</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Review Status Banner */}
                        {activeWorkspace.reviewStatus && (
                            <div className={cn(
                                "shrink-0 border-t px-4 py-3 flex items-center gap-3",
                                activeWorkspace.reviewStatus === "CORRECT"
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                    : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                {activeWorkspace.reviewStatus === "CORRECT" ? (
                                    <ThumbsUp className="w-4 h-4 shrink-0" />
                                ) : (
                                    <ThumbsDown className="w-4 h-4 shrink-0" />
                                )}
                                <span className="text-sm font-medium">
                                    Admin rəyi: {activeWorkspace.reviewStatus === "CORRECT" ? "Düzdür ✓" : "Səhvdir ✗"}
                                </span>
                                {activeWorkspace.reviewNote && (
                                    <span className="text-xs opacity-80 ml-2">— {activeWorkspace.reviewNote}</span>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <Folder className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Soldan fayl seçin və ya yeni fayl yaradın</p>
                    </div>
                )}
            </div>

            {showNewFileModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewFileModal(false)}>
                    <div className="glass-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-medium text-white mb-4">Yeni fayl yarat</h3>
                        <form onSubmit={submitCreateFile} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Faylın adı..."
                                value={newFileName}
                                onChange={e => setNewFileName(e.target.value)}
                                className="w-full bg-[var(--bg-primary)] border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowNewFileModal(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Ləğv et</button>
                                <button type="submit" disabled={!newFileName.trim()} className="glow-btn px-4 py-2 text-sm">Yarat</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingTask(null)}>
                    <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-6 shrink-0 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{viewingTask.title}</h3>
                                    <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(viewingTask.createdAt).toLocaleDateString('az-AZ')}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-[var(--text-secondary)] hover:text-white transition-colors shrink-0 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pr-2">
                            {viewingTask.description || "Təsvir yoxdur"}
                        </div>
                        <div className="shrink-0 pt-4 border-t border-[var(--border-color)] text-right">
                            <button onClick={() => setViewingTask(null)} className="glow-btn px-6 py-2 text-sm">Bağla</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
