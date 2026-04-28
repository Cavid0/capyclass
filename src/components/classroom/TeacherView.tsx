"use client";

import { useState, useMemo, useEffect } from "react";
import {
    Users, ChevronLeft, Plus, ClipboardList, FileCode, Save, Send, Folder,
    Loader2, CheckCircle, ThumbsUp, ThumbsDown, XCircle, Play, Terminal,
    X, Edit2, Trash2, Crown, Calendar, BarChart3, Activity, Languages
} from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditorLazy";
import { cn } from "@/lib/utils";
import { useResizable, useIsDesktop } from "@/lib/useResizable";
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
    const enrollments = useMemo(() => classroom.enrollments || [], [classroom.enrollments]);
    const admins: any[] = useMemo(() => classroom.admins || [], [classroom.admins]);
    const activeWorkspaceData = workspaces.find((w: any) => w.id === selectedWorkspaceId);
    const activeWorkspaceCode = activeWorkspaceData?.code?.replace(/^(?:[ \t]*\r?\n)+/, "") ?? "";
    const isOwner = classroom.teacherId === currentUserId;

    // Sidebar
    const [activeTab, setActiveTab] = useState<"students" | "tasks" | "analytics">("students");
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    // Task modal
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [creatingTask, setCreatingTask] = useState(false);
    const [viewingTask, setViewingTask] = useState<any>(null);

    // Review
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Output
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [outputError, setOutputError] = useState(false);
    const [showOutput, setShowOutput] = useState(false);

    // Resizable panels
    const isDesktop = useIsDesktop();
    const sidebar = useResizable({ storageKey: "teacher-sidebar-width", defaultSize: 320, min: 220, max: 520, direction: "horizontal" });
    const outputPane = useResizable({ storageKey: "teacher-output-height", defaultSize: 192, min: 80, max: 600, direction: "vertical" });

    useEffect(() => {
        setOutput(null);
        setOutputError(false);
        setShowOutput(false);
    }, [selectedWorkspaceId, activeWorkspaceData?.language, activeWorkspaceData?.updatedAt]);

    const analytics = useMemo(() => {
        const totalStudents = enrollments.length;
        const totalWorkspaces = workspaces.length;
        const reviewedCount = workspaces.filter((workspace: any) => Boolean(workspace.reviewStatus)).length;
        const correctCount = workspaces.filter((workspace: any) => workspace.reviewStatus === "CORRECT").length;
        const incorrectCount = workspaces.filter((workspace: any) => workspace.reviewStatus === "INCORRECT").length;
        const activeStudents = new Set(workspaces.map((workspace: any) => workspace.studentId)).size;
        const pendingReviewCount = Math.max(totalWorkspaces - reviewedCount, 0);
        const submissionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
        const reviewRate = totalWorkspaces > 0 ? Math.round((reviewedCount / totalWorkspaces) * 100) : 0;
        const languageCounts = workspaces.reduce((acc: Record<string, number>, workspace: any) => {
            acc[workspace.language] = (acc[workspace.language] || 0) + 1;
            return acc;
        }, {});
        const topLanguages = (Object.entries(languageCounts) as Array<[string, number]>)
            .sort((left: [string, number], right: [string, number]) => right[1] - left[1])
            .slice(0, 5);
        const studentBreakdown = enrollments
            .map((enrollment: any) => {
                const studentWorkspaces = workspaces.filter((workspace: any) => workspace.studentId === enrollment.studentId);
                const reviewed = studentWorkspaces.filter((workspace: any) => Boolean(workspace.reviewStatus)).length;
                return {
                    id: enrollment.studentId,
                    name: enrollment.student.name,
                    workspaceCount: studentWorkspaces.length,
                    reviewed,
                    lastUpdatedAt: studentWorkspaces[0]?.updatedAt || null,
                };
            })
            .sort((left: { workspaceCount: number; name: string }, right: { workspaceCount: number; name: string }) => right.workspaceCount - left.workspaceCount || left.name.localeCompare(right.name));
        const recentActivity = [...workspaces]
            .sort((left: any, right: any) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
            .slice(0, 5);

        return {
            totalStudents,
            totalWorkspaces,
            reviewedCount,
            correctCount,
            incorrectCount,
            activeStudents,
            pendingReviewCount,
            submissionRate,
            reviewRate,
            topLanguages,
            studentBreakdown,
            recentActivity,
        };
    }, [enrollments, workspaces]);

    /* ── Helpers ── */

    const resetTaskForm = () => {
        setEditingTaskId(null);
        setTaskTitle("");
        setTaskDesc("");
        setTaskDueDate("");
    };

    const openCreateTask = () => {
        resetTaskForm();
        setShowTaskModal(true);
    };

    const openEditTask = (t: any) => {
        setEditingTaskId(t.id);
        setTaskTitle(t.title);
        setTaskDesc(t.description || "");
        setTaskDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : "");
        setShowTaskModal(true);
    };

    /* ── API Handlers ── */

    const handleRun = async () => {
        if (!activeWorkspaceCode.trim() || activeWorkspaceData?.language === "html") return;
        setRunning(true);
        setOutput(null);
        setOutputError(false);
        setShowOutput(true);
        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: activeWorkspaceCode, language: activeWorkspaceData?.language }),
            });
            const data = await res.json();
            if (res.ok) {
                setOutput(data.output || "(No output)");
                setOutputError(data.hasError);
            } else {
                setOutput(data.output || data.error || "An error occurred");
                setOutputError(true);
            }
        } catch {
            setOutput("Network error. Please try again.");
            setOutputError(true);
        } finally {
            setRunning(false);
        }
    };

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
                resetTaskForm();
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
        toast("Are you sure you want to remove this user?", {
            description: "Their files will also be deleted.",
            action: {
                label: "Yes, Remove",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/classrooms/${classroom.id}/enrollments/${studentId}`, { method: "DELETE" });
                        if (res.ok) onRefresh();
                        else toast.error("An error occurred");
                    } catch (error) {
                        console.error(error);
                    }
                },
            },
        });
    };

    const handleAddAdmin = async (studentId: string) => {
        toast("Grant admin rights to this user?", {
            description: "The user will become a co-admin alongside you.",
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

    const formatDate = (date: string) =>
        new Date(date).toLocaleString("az-AZ", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });

    /* ── Render ── */

    return (
        <div className="flex flex-col md:flex-row h-full">
            {/* ─── Sidebar ─── */}
            <aside
                className={cn(
                    "w-full border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] shrink-0",
                    selectedWorkspaceId ? "hidden md:flex" : "flex"
                )}
                style={isDesktop ? { width: sidebar.size } : undefined}
            >
                {/* Tab Header */}
                <div className="flex border-b border-[var(--border-color)] shrink-0">
                    {(["students", "tasks", "analytics"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                                activeTab === tab
                                    ? "text-white border-b-2 border-[var(--accent-primary)] bg-[var(--bg-card)]"
                                    : "text-[var(--text-secondary)] hover:text-white"
                            )}
                        >
                            {tab === "students" ? <Users className="w-3.5 h-3.5" /> : tab === "tasks" ? <ClipboardList className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                            {tab === "students" ? `Users (${enrollments.length})` : tab === "tasks" ? `Tasks (${tasks.length})` : "Analytics"}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === "students" ? (
                        <div className="p-2 space-y-1.5">
                            {enrollments.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No one has joined yet</p>
                                </div>
                            ) : (
                                enrollments.map((en: any) => {
                                    const studentWorkspaces = workspaces.filter((w: any) => w.studentId === en.studentId);
                                    const isExpanded = expandedStudent === en.studentId;
                                    const isCoAdmin = admins.some((a: any) => a.userId === en.studentId);

                                    return (
                                        <div key={en.id} className="rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-card)]">
                                            {/* Student Row */}
                                            <div className="flex items-center justify-between p-2.5 hover:bg-[var(--bg-elevated)] transition-colors group">
                                                <button
                                                    onClick={() => setExpandedStudent(isExpanded ? null : en.studentId)}
                                                    className="flex items-center gap-2.5 flex-1 min-w-0"
                                                >
                                                    <div className="w-7 h-7 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                                        {en.student.name?.charAt(0)?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-white truncate">{en.student.name}</span>
                                                    {isCoAdmin && (
                                                        <span className="flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                                            <Crown className="w-2.5 h-2.5" /> Admin
                                                        </span>
                                                    )}
                                                </button>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                                                        {studentWorkspaces.length}
                                                    </span>

                                                    {isCoAdmin && isOwner ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveAdmin(en.studentId); }}
                                                            className="h-6 px-1.5 rounded text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-all border border-amber-500/20"
                                                            title="Revoke admin"
                                                        >
                                                            <Crown className="w-3 h-3" />
                                                        </button>
                                                    ) : !isCoAdmin ? (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleAddAdmin(en.studentId); }}
                                                            className="h-6 px-1.5 rounded text-[10px] bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-all border border-blue-500/20"
                                                            title="Grant admin"
                                                        >
                                                            <Crown className="w-3 h-3" />
                                                        </button>
                                                    ) : null}

                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveStudent(en.studentId); }}
                                                        className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Remove user"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Files */}
                                            {isExpanded && (
                                                <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 space-y-0.5">
                                                    {studentWorkspaces.length === 0 ? (
                                                        <p className="text-xs text-[var(--text-secondary)] p-2 text-center">No files yet</p>
                                                    ) : (
                                                        studentWorkspaces.map((w: any) => {
                                                            const wasSaved = new Date(w.updatedAt).getTime() - new Date(w.createdAt).getTime() > 1000;
                                                            const isActive = selectedWorkspaceId === w.id;
                                                            const hasReview = w.reviewStatus;

                                                            return (
                                                                <button
                                                                    key={w.id}
                                                                    onClick={() => onSelectWorkspace(w.id)}
                                                                    className={cn(
                                                                        "w-full text-left px-2.5 py-2 rounded-md text-xs transition-all flex items-center justify-between gap-2",
                                                                        isActive
                                                                            ? "bg-[var(--bg-card)] border border-[var(--border-color)] text-white"
                                                                            : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-secondary)] border border-transparent"
                                                                    )}
                                                                >
                                                                    <span className="flex items-center gap-1.5 truncate min-w-0">
                                                                        <FileCode className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                                                        <span className="truncate">{w.title}</span>
                                                                    </span>

                                                                    <span className="flex items-center gap-1.5 shrink-0">
                                                                        {hasReview && (
                                                                            <span className={cn(
                                                                                "w-1.5 h-1.5 rounded-full",
                                                                                w.reviewStatus === "CORRECT" ? "bg-emerald-400" : "bg-red-400"
                                                                            )} />
                                                                        )}
                                                                        {wasSaved && !hasReview && (
                                                                            <CheckCircle className="w-3 h-3 text-emerald-400/60" />
                                                                        )}
                                                                        <span className="text-[9px] opacity-50 tabular-nums">
                                                                            {formatDate(w.updatedAt)}
                                                                        </span>
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
                    ) : activeTab === "tasks" ? (
                        <div className="p-2 space-y-1.5">
                            <button
                                onClick={openCreateTask}
                                className="w-full p-2.5 rounded-lg border border-dashed border-[var(--border-color)] text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-hover)] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> New Task
                            </button>

                            {tasks.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No tasks yet</p>
                                </div>
                            ) : (
                                tasks.map((t: any) => (
                                    <div
                                        key={t.id}
                                        onClick={() => setViewingTask(t)}
                                        className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)] transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-medium text-white leading-snug">{t.title}</h4>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => openEditTask(t)} className="p-1 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all" title="Edit">
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => handleDeleteTask(t.id)} className="p-1 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded transition-all" title="Delete">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        {t.description && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{t.description}</p>}
                                        {t.dueDate && (
                                            <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--text-secondary)] opacity-70">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(t.dueDate)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        <span>Students</span>
                                        <Users className="w-3.5 h-3.5 text-blue-300" />
                                    </div>
                                    <div className="text-xl font-semibold text-white">{analytics.totalStudents}</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">{analytics.activeStudents} active</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        <span>Files</span>
                                        <Activity className="w-3.5 h-3.5 text-emerald-300" />
                                    </div>
                                    <div className="text-xl font-semibold text-white">{analytics.totalWorkspaces}</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">{analytics.pendingReviewCount} pending review</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        <span>Submissions</span>
                                        <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
                                    </div>
                                    <div className="text-xl font-semibold text-white">{analytics.submissionRate}%</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">students submitted</div>
                                </div>
                                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                        <span>Reviewed</span>
                                        <CheckCircle className="w-3.5 h-3.5 text-indigo-300" />
                                    </div>
                                    <div className="text-xl font-semibold text-white">{analytics.reviewRate}%</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">review completion</div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-white">Review breakdown</h4>
                                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">{tasks.length} tasks</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2">
                                        <div className="text-lg font-semibold text-emerald-300">{analytics.correctCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-emerald-200/80">Correct</div>
                                    </div>
                                    <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2">
                                        <div className="text-lg font-semibold text-red-300">{analytics.incorrectCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-red-200/80">Incorrect</div>
                                    </div>
                                    <div className="rounded-md bg-white/5 border border-white/10 p-2">
                                        <div className="text-lg font-semibold text-white">{analytics.pendingReviewCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Pending</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <Languages className="w-4 h-4 text-[var(--text-secondary)]" />
                                    <h4 className="text-sm font-medium text-white">Top languages</h4>
                                </div>
                                {analytics.topLanguages.length === 0 ? (
                                    <p className="text-xs text-[var(--text-secondary)]">No language activity yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {analytics.topLanguages.map(([language, count]) => (
                                            <div key={language} className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                                                <span className="capitalize text-white">{language}</span>
                                                <span>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                                <h4 className="text-sm font-medium text-white mb-3">Student progress</h4>
                                {analytics.studentBreakdown.length === 0 ? (
                                    <p className="text-xs text-[var(--text-secondary)]">No student activity yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {analytics.studentBreakdown.slice(0, 6).map((student: { id: string; name: string; workspaceCount: number; reviewed: number; lastUpdatedAt: string | null }) => (
                                            <div key={student.id} className="flex items-center justify-between gap-3 text-xs">
                                                <div className="min-w-0">
                                                    <p className="text-white truncate">{student.name}</p>
                                                    <p className="text-[var(--text-secondary)]">{student.workspaceCount} files • {student.reviewed} reviewed</p>
                                                </div>
                                                <span className="text-[var(--text-secondary)] whitespace-nowrap">{student.lastUpdatedAt ? formatDate(student.lastUpdatedAt) : "No activity"}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Sidebar resize handle (desktop only) ─── */}
            {isDesktop && (
                <div
                    onMouseDown={sidebar.startDrag}
                    onTouchStart={sidebar.startDrag}
                    className={cn(
                        "hidden md:block w-1 shrink-0 cursor-col-resize bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors",
                        sidebar.dragging && "bg-[var(--accent-primary)]"
                    )}
                    role="separator"
                    aria-orientation="vertical"
                />
            )}

            {/* ─── Main Editor Area ─── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg-primary)]">
                {selectedWorkspaceId && activeWorkspaceData ? (
                    <>
                        {/* Toolbar */}
                        <div className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-2 shrink-0">
                            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                                <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)] hover:text-white">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-white font-medium truncate">{activeWorkspaceData.student.name}</span>
                                <span className="text-[var(--text-secondary)] opacity-40">/</span>
                                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-0.5 rounded truncate">
                                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                                    {activeWorkspaceData.title}
                                </span>
                            </div>

                            <div className="flex items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
                                {activeWorkspaceData.language !== "html" && (
                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                        Run
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Editor + Output */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-primary)]">
                                <CodeEditor
                                    key={`${activeWorkspaceData.id}-${activeWorkspaceData.updatedAt}`}
                                    language={activeWorkspaceData.language}
                                    value={activeWorkspaceCode}
                                    readOnly
                                />
                            </div>

                            {showOutput && (
                                <>
                                    <div
                                        onMouseDown={outputPane.startDrag}
                                        onTouchStart={outputPane.startDrag}
                                        className={cn(
                                            "shrink-0 h-1 cursor-row-resize bg-[var(--border-color)] hover:bg-[var(--accent-primary)] transition-colors",
                                            outputPane.dragging && "bg-[var(--accent-primary)]"
                                        )}
                                        role="separator"
                                        aria-orientation="horizontal"
                                    />
                                    <div
                                        className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col shrink-0"
                                        style={{ height: isDesktop ? outputPane.size : 192 }}
                                    >
                                        <div className="h-8 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-4 shrink-0">
                                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                <Terminal className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium uppercase tracking-wider">Output</span>
                                            </div>
                                            <button onClick={() => setShowOutput(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                            {running ? (
                                                <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Running...
                                                </div>
                                            ) : (
                                                <pre className={cn("text-sm font-mono whitespace-pre-wrap", outputError ? "text-red-400" : "text-emerald-300")}>{output}</pre>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Review Panel */}
                        <div className="shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 relative z-10">
                            {activeWorkspaceData.reviewStatus && reviewingId !== activeWorkspaceData.id ? (
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border",
                                        activeWorkspaceData.reviewStatus === "CORRECT"
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                            : "bg-red-500/10 border-red-500/20 text-red-400"
                                    )}
                                >
                                    {activeWorkspaceData.reviewStatus === "CORRECT" ? <ThumbsUp className="w-4 h-4 shrink-0" /> : <ThumbsDown className="w-4 h-4 shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">
                                            {activeWorkspaceData.reviewStatus === "CORRECT" ? "Correct ✓" : "Incorrect ✗"}
                                        </p>
                                        {activeWorkspaceData.reviewNote && (
                                            <p className="text-xs mt-0.5 opacity-80 truncate">{activeWorkspaceData.reviewNote}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setReviewingId(activeWorkspaceData.id)}
                                        className="shrink-0 text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-3 py-1.5 rounded border border-[var(--border-color)] hover:bg-[var(--bg-elevated)]"
                                    >
                                        Edit
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {!activeWorkspaceData.reviewStatus && (
                                        <p className="text-xs text-[var(--text-secondary)]">Review this file:</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={reviewNote}
                                            onChange={(e) => setReviewNote(e.target.value)}
                                            className="input-field flex-1 !h-9 text-sm"
                                            placeholder="Note (optional)..."
                                        />
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "CORRECT")}
                                            disabled={submittingReview}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                                            Correct
                                        </button>
                                        <button
                                            onClick={() => handleReview(activeWorkspaceData.id, "INCORRECT")}
                                            disabled={submittingReview}
                                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium"
                                        >
                                            {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                                            Incorrect
                                        </button>
                                        {reviewingId && (
                                            <button
                                                onClick={() => { setReviewingId(null); setReviewNote(""); }}
                                                className="shrink-0 p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <Folder className="w-12 h-12 mb-3 opacity-15" />
                        <p className="text-sm">Select a user&apos;s file to review</p>
                    </div>
                )}
            </main>

            {/* ─── Task Create/Edit Modal ─── */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTaskModal(false)}>
                    <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center">
                                <ClipboardList className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">{editingTaskId ? "Edit Task" : "New Task"}</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Visible to all members</p>
                            </div>
                        </div>

                        <form onSubmit={handleTaskSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Title *</label>
                                <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="input-field" placeholder="e.g. Write the Fibonacci sequence" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                                <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className="input-field min-h-[100px] resize-none" placeholder="Detailed description..." />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Deadline</label>
                                <input
                                    type="datetime-local"
                                    value={taskDueDate}
                                    onChange={(e) => setTaskDueDate(e.target.value)}
                                    className="input-field"
                                    style={{ colorScheme: "dark" }}
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowTaskModal(false); resetTaskForm(); }}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={creatingTask || !taskTitle.trim()} className="glow-btn px-4 py-2 text-sm flex items-center gap-2">
                                    {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTaskId ? <><Save className="w-4 h-4" /> Save</> : <><Send className="w-4 h-4" /> Create</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── View Task Modal ─── */}
            {viewingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewingTask(null)}>
                    <div className="glass-card p-6 w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4 shrink-0 gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-base font-semibold text-white truncate">{viewingTask.title}</h3>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-[var(--text-secondary)] hover:text-white transition-colors shrink-0 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed pr-1">
                            {viewingTask.description || "No description"}
                        </div>

                        {viewingTask.dueDate && (
                            <div className="flex items-center gap-1.5 mt-3 text-xs text-[var(--text-secondary)]">
                                <Calendar className="w-3.5 h-3.5" />
                                Deadline: {formatDate(viewingTask.dueDate)}
                            </div>
                        )}

                        <div className="shrink-0 pt-4 mt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => { openEditTask(viewingTask); setViewingTask(null); }}
                                    className="p-2 text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all"
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteTask(viewingTask.id)}
                                    className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <button onClick={() => setViewingTask(null)} className="text-xs text-[var(--text-secondary)] hover:text-white transition-colors px-3 py-1.5">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
