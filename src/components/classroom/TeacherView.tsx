"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
    Users, ChevronLeft, Plus, ClipboardList, FileCode, Save, Send, Folder, Loader2, CheckCircle, Bell, ThumbsUp, ThumbsDown, XCircle, Play, Terminal, X, Edit2, Trash2, Crown
} from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TeacherViewProps {
    classroom: any;
    tasks: any[];
    selectedWorkspaceId: string | null;
    onSelectWorkspace: (id: string | null) => void;
    onTaskCreated: () => void;
    onRefresh: (isPolling?: boolean) => void;
    currentUserId: string;
}

export function TeacherView({ classroom, tasks, selectedWorkspaceId, onSelectWorkspace, onTaskCreated, onRefresh, currentUserId }: TeacherViewProps) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const workspaces = useMemo(() => classroom.workspaces || [], [classroom.workspaces]);
    const enrollments = classroom.enrollments || [];
    const admins: any[] = classroom.admins || [];

    const activeWorkspaceData = workspaces.find((w: any) => w.id === selectedWorkspaceId);

    const [activeTab, setActiveTab] = useState<"students" | "tasks">("students");
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [creatingTask, setCreatingTask] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    const isOwner = classroom.teacherId === currentUserId;

    const [taskDueDate, setTaskDueDate] = useState("");

    const openCreateTask = () => {
        setEditingTaskId(null);
        setTaskTitle("");
        setTaskDesc("");
        setTaskDueDate("");
        setShowTaskModal(true);
    };

    const openEditTask = (t: any) => {
        setEditingTaskId(t.id);
        setTaskTitle(t.title);
        setTaskDesc(t.description || "");
        setTaskDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : "");
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
                setOutput(data.output || "(No output)");
                setOutputError(data.hasError);
            } else {
                setOutput(data.error || "An error occurred");
                setOutputError(true);
            }
        } catch {
            setOutput("Network error. Please try again.");
            setOutputError(true);
        } finally {
            setRunning(false);
        }
    };

    // Notifications for when a student saves code
    const prevWorkspacesRef = useRef<any[]>([]);
    const [notifications, setNotifications] = useState<{ id: string; message: string; workspaceId: string }[]>([]);

    useEffect(() => {
        const prev = prevWorkspacesRef.current;
        if (prev.length > 0) {
            const newUpdates = workspaces.filter((w: any) => {
                const oldW = prev.find((p: any) => p.id === w.id);
                return oldW && new Date(w.updatedAt).getTime() > new Date(oldW.updatedAt).getTime();
            });

            if (newUpdates.length > 0) {
                const newNotifs = newUpdates.map((w: any) => ({
                    id: Math.random().toString(),
                    message: `${w.student.name} saved file "${w.title}"`,
                    workspaceId: w.id,
                }));

                setNotifications((prevNotifs) => [...prevNotifs, ...newNotifs]);

                setTimeout(() => {
                    setNotifications((prevNotifs) => prevNotifs.filter((n) => !newNotifs.find((nn: any) => nn.id === n.id)));
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
            const url = editingTaskId ? `/api/tasks/${editingTaskId}` : `/api/classrooms/${classroom.id}/tasks`;
            const method = editingTaskId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: taskTitle, description: taskDesc, dueDate: taskDueDate || null }),
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
        toast("Are you sure you want to delete this task?", {
            action: {
                label: "Yes, Delete",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
                        if (res.ok) {
                            if (viewingTask?.id === taskId) setViewingTask(null);
                            onTaskCreated();
                        }
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        });
    };

    const handleRemoveStudent = async (studentId: string) => {
        toast("Are you sure you want to remove this student?", {
            description: "Their files will also be deleted.",
            action: {
                label: "Yes, Remove",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroom.id}/enrollments/${studentId}`, { method: "DELETE" });
                        if (res.ok) {
                            onRefresh();
                        } else {
                            toast.error("An error occurred");
                        }
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        });
    };

    const handleAddAdmin = async (studentId: string) => {
        toast("Grant admin rights to this student?", {
            description: "You will remain an admin. The student will become a co-admin alongside you.",
            action: {
                label: "Yes",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroom.id}/transfer`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ newTeacherId: studentId }),
                        });
                        if (res.ok) {
                            toast.success("Admin rights granted");
                            onRefresh();
                        } else {
                            const data = await res.json();
                            toast.error(data.error || "An error occurred");
                        }
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        });
    };

    const handleRemoveAdmin = async (adminUserId: string) => {
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/transfer`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: adminUserId }),
            });
            if (res.ok) {
                toast.success("Admin rights revoked");
                onRefresh();
            } else {
                const data = await res.json();
                toast.error(data.error || "An error occurred");
            }
        } catch (error) {
            console.error(error);
        }
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
        <div className="flex flex-col md:flex-row bg-[var(--bg-primary)]" style={{ height: "calc(100vh - 3.5rem)" }}>
            {/* Sidebar */}
            <div
                className={cn(
                    "w-full md:w-80 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--bg-secondary)] shrink-0 transition-all",
                    selectedWorkspaceId ? "hidden md:flex" : "flex"
                )}
            >
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)]">
                    <button
                        onClick={() => setActiveTab("students")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "students" ? "text-white border-b-2 border-white bg-[var(--bg-card)]" : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        Students ({enrollments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activeTab === "tasks" ? "text-white border-b-2 border-white bg-[var(--bg-card)]" : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tasks ({tasks.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === "students" ? (
                        <div className="p-2 space-y-2">
                            {enrollments.length === 0 ? (
                                <div className="text-center p-6 text-[var(--text-secondary)] text-sm">No one has joined the class yet</div>
                            ) : (
                                enrollments.map((en: any) => {
                                    const studentWorkspaces = workspaces.filter((w: any) => w.studentId === en.studentId);
                                    const isExpanded = expandedStudent === en.studentId;
                                    const isCoAdmin = admins.some((a: any) => a.userId === en.studentId);

                                    return (
                                        <div key={en.id} className="border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-card)]">
                                            <div className="w-full text-left p-3 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between group">
                                                <button onClick={() => setExpandedStudent(isExpanded ? null : en.studentId)} className="flex items-center gap-2 flex-1">
                                                    <div className="w-6 h-6 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-white">
                                                        {en.student.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-white">{en.student.name}</span>
                                                    {isCoAdmin && (
                                                        <span className="flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                                            <Crown className="w-2.5 h-2.5" />
                                                            Admin
                                                        </span>
                                                    )}
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded pointer-events-none">
                                                        {studentWorkspaces.length} files
                                                    </div>
                                                    {isCoAdmin && isOwner ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveAdmin(en.studentId);
                                                            }}
                                                            className="h-7 px-2 rounded flex items-center justify-center text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-all border border-amber-500/20"
                                                        >
                                                            Admin Al
                                                        </button>
                                                    ) : !isCoAdmin ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddAdmin(en.studentId);
                                                            }}
                                                            className="h-7 px-2 rounded flex items-center justify-center text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-all border border-blue-500/20"
                                                        >
                                                            Admin Et
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveStudent(en.studentId);
                                                        }}
                                                        className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-500/30"
                                                        title="Remove student from class"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 space-y-1">
                                                    {studentWorkspaces.length === 0 ? (
                                                        <div className="text-xs text-[var(--text-secondary)] p-2 text-center">No files created yet</div>
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
                                                                                Submitted
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-[9px] opacity-70 ml-2 shrink-0">
                                                                        {new Date(w.updatedAt).toLocaleString("az-AZ", {
                                                                            day: "2-digit",
                                                                            month: "2-digit",
                                                                            year: "numeric",
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
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
                                <Plus className="w-4 h-4" /> New Task
                            </button>

                            {tasks.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">No tasks yet</div>
                            ) : (
                                tasks.map((t: any) => (
                                    <div
                                        key={t.id}
                                        onClick={() => setViewingTask(t)}
                                        className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)] transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <h4 className="text-sm font-medium text-white">{t.title}</h4>
                                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => openEditTask(t)} className="p-1 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all" title="Edit">
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleDeleteTask(t.id)} className="p-1 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Delete">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        {t.description && <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{t.description}</p>}
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
                                        Read only
                                    </div>
                                    {activeWorkspaceData.language !== "html" && (
                                        <button
                                            onClick={handleRun}
                                            disabled={running}
                                            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                        >
                                            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                            Run
                                        </button>
                                    )}
                                </div>
                                <CodeEditor key={`${activeWorkspaceData.id}-${activeWorkspaceData.updatedAt}`} language={activeWorkspaceData.language} value={activeWorkspaceData.code} readOnly />
                            </div>

                            {/* Output Panel */}
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
                                                <span>Running program...</span>
                                            </div>
                                        ) : (
                                            <pre className={cn("text-sm font-mono whitespace-pre-wrap", outputError ? "text-red-400" : "text-[#e6edf3]")}>{output}</pre>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Review Panel */}
                        <div className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                            {activeWorkspaceData.reviewStatus ? (
                                <div
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border",
                                        activeWorkspaceData.reviewStatus === "CORRECT" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}
                                >
                                    {activeWorkspaceData.reviewStatus === "CORRECT" ? <ThumbsUp className="w-5 h-5 shrink-0" /> : <ThumbsDown className="w-5 h-5 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{activeWorkspaceData.reviewStatus === "CORRECT" ? "Correct ✓" : "Incorrect ✗"}</p>
                                        {activeWorkspaceData.reviewNote && <p className="text-xs mt-1 opacity-80">{activeWorkspaceData.reviewNote}</p>}
                                    </div>
                                    <button onClick={() => setReviewingId(activeWorkspaceData.id)} className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                                        Edit
                                    </button>
                                </div>
                            ) : null}

                            {(!activeWorkspaceData.reviewStatus || reviewingId === activeWorkspaceData.id) && (
                                <div className="space-y-3">
                                    {!activeWorkspaceData.reviewStatus && <p className="text-xs text-[var(--text-secondary)]">Review this file:</p>}
                                    <div className="flex items-center gap-2">
                                        <input type="text" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} className="input-field flex-1 text-sm" placeholder="Note (optional)..." />
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "CORRECT")}
                                            disabled={submittingReview}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                                            Correct
                                        </button>
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "INCORRECT")}
                                            disabled={submittingReview}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                                            Incorrect
                                        </button>
                                        {reviewingId && (
                                            <button
                                                onClick={() => {
                                                    setReviewingId(null);
                                                    setReviewNote("");
                                                }}
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
                        <p className="text-sm">Select a student&apos;s file from the sidebar to view</p>
                    </div>
                )}
            </div>

            {/* Create Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTaskModal(false)}>
                    <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center">
                                <ClipboardList className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{editingTaskId ? "Update Task" : "New Task"}</h3>
                                <p className="text-xs text-[var(--text-secondary)]">All students will see this task</p>
                            </div>
                        </div>

                        <form onSubmit={handleTaskSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Title *</label>
                                    <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="input-field" placeholder="e.g. Write the Fibonacci sequence" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description (optional)</label>
                                    <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className="input-field min-h-[100px] resize-none" placeholder="Detailed description of the task..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Deadline (optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={taskDueDate}
                                        onChange={(e) => setTaskDueDate(e.target.value)}
                                        className="input-field"
                                        style={{ colorScheme: "dark" }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTaskModal(false);
                                        setEditingTaskId(null);
                                        setTaskDueDate("");
                                    }}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={creatingTask || !taskTitle.trim()} className="glow-btn px-4 py-2 text-sm flex items-center gap-2">
                                    {creatingTask ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editingTaskId ? (
                                        <>
                                            <Save className="w-4 h-4" /> Save
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" /> Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Task Modal */}
            {viewingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingTask(null)}>
                    <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-6 shrink-0 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{viewingTask.title}</h3>
                                </div>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-[var(--text-secondary)] hover:text-white transition-colors shrink-0 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pr-2">
                            {viewingTask.description || "No description"}
                            <div className="shrink-0 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            openEditTask(viewingTask);
                                            setViewingTask(null);
                                        }}
                                        className="p-2 text-[var(--text-secondary)] hover:text-blue-400 border border-transparent hover:border-blue-500/20 hover:bg-blue-500/10 rounded-md transition-all"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(viewingTask.id)}
                                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 rounded-md transition-all"
                                        title="Delete"
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
                {notifications.map((n) => (
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
