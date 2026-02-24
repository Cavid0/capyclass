"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
    Users, Code2, ChevronLeft, Activity, Cpu, RefreshCw,
    Plus, ClipboardList, Clock, FileCode, Save, Loader2,
    CheckCircle, AlertCircle, Send
} from "lucide-react";
import Link from "next/link";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AIFeedback } from "@/components/ai/AIFeedback";
import { cn } from "@/lib/utils";

export default function ClassroomPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const [classroom, setClassroom] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchClassroom = useCallback(async (isPolling = false) => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}`);
            if (!res.ok) {
                if (res.status === 403 || res.status === 404) router.push("/dashboard");
                return;
            }
            const data = await res.json();
            // Flatten: API returns { classroom: {...}, workspaces/workspace }
            setClassroom({
                ...data.classroom,
                workspaces: data.workspaces || [],
                workspace: data.workspace || null,
            });
        } catch (error) {
            console.error(error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [params.id, router]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}/tasks`);
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
        if (status === "authenticated" && (session?.user as any)?.role === "TEACHER") {
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

    const role = (session?.user as any)?.role;
    const isTeacher = role === "TEACHER";
    const myWorkspace = !isTeacher ? classroom.workspace : null;

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
                            <span>{classroom.workspaces?.length || 0} tələbə</span>
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
                        selectedWorkspace={selectedWorkspace}
                        onSelectWorkspace={(id: string) => {
                            if (selectedWorkspace === id) setSelectedWorkspace(null);
                            else setSelectedWorkspace(id);
                        }}
                        onTaskCreated={fetchTasks}
                    />
                ) : (
                    <StudentView
                        workspace={myWorkspace}
                        tasks={tasks}
                        classroomName={classroom.name}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================
// TEACHER VIEW
// =============================================================
function TeacherView({ classroom, tasks, selectedWorkspace, onSelectWorkspace, onTaskCreated }: any) {
    const workspaces = classroom.workspaces || [];
    const activeWorkspaceData = workspaces.find((w: any) => w.id === selectedWorkspace);
    const [activeTab, setActiveTab] = useState<"students" | "tasks">("students");
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [creatingTask, setCreatingTask] = useState(false);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskTitle.trim()) return;
        setCreatingTask(true);
        try {
            const res = await fetch(`/api/classrooms/${classroom.id}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: taskTitle, description: taskDesc }),
            });
            if (res.ok) {
                setShowTaskModal(false);
                setTaskTitle("");
                setTaskDesc("");
                onTaskCreated();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreatingTask(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[var(--bg-primary)]">
            {/* Sidebar */}
            <div className={cn(
                "w-full md:w-80 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--bg-secondary)] shrink-0 transition-all",
                selectedWorkspace ? "hidden md:flex" : "flex"
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
                        Tələbələr ({workspaces.length})
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
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "students" ? (
                        <div className="p-2 space-y-1">
                            {workspaces.length === 0 ? (
                                <div className="text-center p-6 text-[var(--text-secondary)] text-sm">
                                    Sinfə hələ heç kim qoşulmayıb
                                </div>
                            ) : (
                                workspaces.map((w: any) => (
                                    <button
                                        key={w.id}
                                        onClick={() => onSelectWorkspace(w.id)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg transition-all border",
                                            selectedWorkspace === w.id
                                                ? "bg-[var(--bg-elevated)] border-[var(--border-hover)] shadow-lg"
                                                : "bg-transparent border-transparent hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-white">
                                                    {w.student.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    selectedWorkspace === w.id ? "text-white" : "text-[var(--text-secondary)]"
                                                )}>
                                                    {w.student.name}
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                                w.status === "PASS" ? "text-emerald-400 bg-emerald-900/30" :
                                                    w.status === "FAIL" ? "text-rose-400 bg-rose-900/30" :
                                                        "text-yellow-400 bg-yellow-900/30"
                                            )}>
                                                {w.status === "PASS" ? "✓ Keçdi" : w.status === "FAIL" ? "✗ Kəsildi" : "◌ Gözləyir"}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1 ml-8">
                                            <Clock className="w-3 h-3" />
                                            {new Date(w.updatedAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            <button
                                onClick={() => setShowTaskModal(true)}
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
                                    <div key={t.id} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
                                        <h4 className="text-sm font-medium text-white mb-1">{t.title}</h4>
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
                {selectedWorkspace && activeWorkspaceData ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-4 px-4 shrink-0">
                            <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)]">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-bold text-white">
                                {activeWorkspaceData.student.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm text-white font-medium">{activeWorkspaceData.student.name}</span>
                            <span className="text-xs text-[var(--text-secondary)]">— Tələbə kodu</span>
                            <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-medium ml-auto",
                                activeWorkspaceData.status === "PASS" ? "text-emerald-400 bg-emerald-900/30" :
                                    activeWorkspaceData.status === "FAIL" ? "text-rose-400 bg-rose-900/30" :
                                        "text-yellow-400 bg-yellow-900/30"
                            )}>
                                {activeWorkspaceData.status}
                            </span>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            <div className="flex-1 border-r border-[var(--border-color)] bg-[#0e0e0e] relative h-1/2 lg:h-full">
                                <div className="absolute top-2 right-4 z-10 bg-[#1e1e1e] border border-[var(--border-color)] px-2 py-1 rounded text-[10px] text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                                    <FileCode className="w-3 h-3" /> Yalnız oxu
                                </div>
                                <CodeEditor
                                    language="javascript"
                                    value={activeWorkspaceData.code}
                                    readOnly
                                />
                            </div>
                            <div className="w-full lg:w-96 flex flex-col h-1/2 lg:h-full bg-[var(--bg-secondary)] overflow-y-auto">
                                <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-2 sticky top-0 bg-[var(--bg-secondary)] backdrop-blur-md z-10">
                                    <Activity className="w-4 h-4 text-[var(--text-secondary)]" />
                                    <h3 className="text-sm font-semibold text-white">AI Rəy</h3>
                                </div>
                                <div className="p-4">
                                    <AIFeedback feedback={activeWorkspaceData.feedbacks?.[0]} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <Cpu className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm">Ətraflı baxmaq üçün soldan tələbə seçin</p>
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
                                <h3 className="text-lg font-semibold text-white">Yeni Tapşırıq</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Bütün tələbələr bu tapşırığı görəcək</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTask}>
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
                                    onClick={() => setShowTaskModal(false)}
                                    className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors"
                                >Ləğv et</button>
                                <button
                                    type="submit"
                                    disabled={creatingTask || !taskTitle.trim()}
                                    className="glow-btn px-4 py-2 text-sm flex items-center gap-2"
                                >
                                    {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Göndər</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================
// STUDENT VIEW
// =============================================================
function StudentView({ workspace, tasks, classroomName }: any) {
    const [code, setCode] = useState(workspace?.code || "// Kodunuzu bura yazın\nconsole.log('Salam!');");
    const [feedback, setFeedback] = useState<any>(workspace?.feedbacks?.[0] || null);
    const [analyzing, setAnalyzing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [language, setLanguage] = useState("javascript");
    const [activePanel, setActivePanel] = useState<"tasks" | "ai">("tasks");

    const handleSaveAndAnalyze = async () => {
        if (!workspace) return;
        setAnalyzing(true);
        setSaved(false);
        try {
            const res = await fetch(`/api/workspaces/${workspace.id}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language }),
            });
            const data = await res.json();
            if (res.ok && data.feedback) {
                setFeedback(data.feedback);
                setSaved(true);
                setActivePanel("ai");
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleSaveOnly = async () => {
        if (!workspace) return;
        setSaved(false);
        try {
            await fetch(`/api/workspaces/${workspace.id}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language }),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full">
            {/* Editor Pane */}
            <div className="flex-1 flex flex-col border-r border-[var(--border-color)] min-h-[50vh] lg:min-h-0 bg-[#0e0e0e]">
                <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs rounded px-2 py-1 outline-none focus:border-white transition-colors"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                        </select>

                        {saved && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse">
                                <CheckCircle className="w-3 h-3" /> Saxlandı
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSaveOnly}
                            className="secondary-btn px-3 py-1.5 text-xs flex items-center gap-1.5"
                        >
                            <Save className="w-3.5 h-3.5" /> Saxla
                        </button>
                        <button
                            onClick={handleSaveAndAnalyze}
                            disabled={analyzing}
                            className="glow-btn px-3 py-1.5 text-xs flex items-center gap-2"
                        >
                            {analyzing ? (
                                <><div className="spinner !w-3 !h-3" /> Analiz gedir...</>
                            ) : (
                                <><Sparkles className="w-3.5 h-3.5" /> Saxla &amp; Analiz Et</>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <CodeEditor
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        language={language}
                    />
                </div>
            </div>

            {/* Right Panel - Tasks & AI */}
            <div className="w-full lg:w-[400px] flex flex-col h-[50vh] lg:h-full bg-[var(--bg-secondary)] shrink-0 overflow-hidden">
                {/* Panel Tabs */}
                <div className="flex border-b border-[var(--border-color)] shrink-0">
                    <button
                        onClick={() => setActivePanel("tasks")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activePanel === "tasks"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <ClipboardList className="w-3.5 h-3.5" />
                        Tapşırıqlar
                        {tasks.length > 0 && (
                            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActivePanel("ai")}
                        className={cn(
                            "flex-1 py-3 text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-1.5",
                            activePanel === "ai"
                                ? "text-white border-b-2 border-white bg-[var(--bg-card)]"
                                : "text-[var(--text-secondary)] hover:text-white"
                        )}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        AI Köməkçi
                        {feedback?.status && (
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full",
                                feedback.status === "PASS" ? "bg-emerald-900/30 text-emerald-400" : "bg-rose-900/30 text-rose-400"
                            )}>
                                {feedback.status === "PASS" ? "✓" : "✗"}
                            </span>
                        )}
                    </button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activePanel === "tasks" ? (
                        <div className="p-4 space-y-3">
                            {tasks.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-secondary)]">
                                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Hələ tapşırıq yoxdur</p>
                                    <p className="text-xs mt-1">Müəllim tapşırıq əlavə etdikdə burada görünəcək</p>
                                </div>
                            ) : (
                                tasks.map((t: any, i: number) => (
                                    <div key={t.id} className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-colors">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0 mt-0.5">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-white mb-1">{t.title}</h4>
                                                {t.description && (
                                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{t.description}</p>
                                                )}
                                                <div className="text-[10px] text-[var(--text-secondary)] mt-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(t.createdAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-4 flex-1">
                            <AIFeedback feedback={feedback} analyzing={analyzing} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
        </svg>
    );
}
