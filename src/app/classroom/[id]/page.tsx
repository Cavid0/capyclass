"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Users, Code2, ChevronLeft, Activity, Cpu, RefreshCw } from "lucide-react";
import Link from "next/link";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { AIFeedback } from "@/components/ai/AIFeedback";
import { cn } from "@/lib/utils";

export default function ClassroomPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const [classroom, setClassroom] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchClassroom = useCallback(async (isPolling = false) => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}`);
            if (!res.ok) {
                if (res.status === 403 || res.status === 404) router.push("/dashboard");
                return;
            }
            const data = await res.json();
            setClassroom(data);
            setLastRefresh(new Date());
        } catch (error) {
            console.error(error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [params.id, router]);

    useEffect(() => {
        if (status === "authenticated") fetchClassroom();
    }, [status, fetchClassroom]);

    // Auto-poll every 5 seconds for teacher to see student updates
    useEffect(() => {
        if (status === "authenticated" && (session?.user as any)?.role === "TEACHER") {
            intervalRef.current = setInterval(() => {
                fetchClassroom(true);
            }, 5000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
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

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                {isTeacher ? (
                    <TeacherView
                        classroom={classroom}
                        selectedWorkspace={selectedWorkspace}
                        onSelectWorkspace={(id: string) => {
                            if (selectedWorkspace === id) setSelectedWorkspace(null);
                            else setSelectedWorkspace(id);
                        }}
                    />
                ) : (
                    myWorkspace && (
                        <StudentView
                            workspaceId={myWorkspace.id}
                            initialCode={myWorkspace.code}
                            initialFeedback={myWorkspace.feedbacks?.[0]}
                        />
                    )
                )}
            </div>
        </div>
    );
}

// -------------------------------------------------------------
// TEACHER VIEW
// -------------------------------------------------------------
function TeacherView({ classroom, selectedWorkspace, onSelectWorkspace }: any) {
    const workspaces = classroom.workspaces || [];
    const activeWorkspaceData = workspaces.find((w: any) => w.id === selectedWorkspace);

    return (
        <div className="h-full flex flex-col md:flex-row bg-[var(--bg-primary)]">
            {/* Sidebar List */}
            <div className={cn(
                "w-full md:w-80 border-r border-[var(--border-color)] flex flex-col h-full bg-[var(--bg-secondary)] shrink-0 transition-all",
                selectedWorkspace ? "hidden md:flex" : "flex"
            )}>
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
                    <h2 className="text-sm font-semibold text-white tracking-tight">Tələbə Siyahısı</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Analiz nəticələrinə baxmaq üçün seçin</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                                    "w-full text-left p-3 rounded-md transition-colors border",
                                    selectedWorkspace === w.id
                                        ? "bg-[var(--bg-elevated)] border-[var(--border-hover)]"
                                        : "bg-transparent border-transparent hover:bg-[var(--bg-card)] hover:border-[var(--border-color)]"
                                )}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        selectedWorkspace === w.id ? "text-white" : "text-[var(--text-secondary)]"
                                    )}>
                                        {w.student.name}
                                    </span>
                                    <span className={cn(
                                        "status-badge",
                                        w.status === "PASS" ? "text-emerald-400 border-emerald-900/50 bg-emerald-900/20" :
                                            w.status === "FAIL" ? "text-rose-400 border-rose-900/50 bg-rose-900/20" :
                                                "text-[var(--text-secondary)]"
                                    )}>
                                        {w.status}
                                    </span>
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)] flex items-center justify-between">
                                    <span>Son yenilənmə:</span>
                                    <span>{new Date(w.updatedAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Editor/Feedback Detail */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
                {selectedWorkspace && activeWorkspaceData ? (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-4 px-4 shrink-0">
                            <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)]">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-white font-medium">{activeWorkspaceData.student.name}</span>
                            <span className="text-xs text-[var(--text-secondary)]">— Tələbə kodu</span>
                        </div>

                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                            <div className="flex-1 border-r border-[var(--border-color)] bg-[#0e0e0e] relative h-1/2 lg:h-full">
                                <div className="absolute top-2 right-4 z-10 bg-[#1e1e1e] border border-[var(--border-color)] px-2 py-1 rounded text-xs text-[var(--text-secondary)] uppercase">
                                    Tələbə Kod Yazır
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
                                    <h3 className="text-sm font-semibold text-white">AI Son Rəy</h3>
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
        </div>
    );
}

// -------------------------------------------------------------
// STUDENT VIEW
// -------------------------------------------------------------
function StudentView({ workspaceId, initialCode, initialFeedback }: any) {
    const [code, setCode] = useState(initialCode || "// Kodunuzu bura yazın\nconsole.log('Salam Dünya!');");
    const [feedback, setFeedback] = useState<any>(initialFeedback || null);
    const [analyzing, setAnalyzing] = useState(false);
    const [language, setLanguage] = useState("javascript");

    const handleSaveAndAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (res.ok && data.feedback) {
                setFeedback(data.feedback);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setAnalyzing(false);
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
                    </div>

                    <button
                        onClick={handleSaveAndAnalyze}
                        disabled={analyzing}
                        className="glow-btn px-3 py-1.5 text-xs flex items-center gap-2"
                    >
                        {analyzing ? (
                            <><div className="spinner !w-3 !h-3" /> Analiz gedir...</>
                        ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Saxla & Analiz Et</>
                        )}
                    </button>
                </div>

                <div className="flex-1 relative">
                    <CodeEditor
                        value={code}
                        onChange={(val) => setCode(val || "")}
                        language={language}
                    />
                </div>
            </div>

            {/* AI Assistant Pane */}
            <div className="w-full lg:w-[400px] flex flex-col h-[50vh] lg:h-full bg-[var(--bg-secondary)] shrink-0 overflow-y-auto custom-scrollbar">
                <div className="p-4 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-secondary)]/90 backdrop-blur-md z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-white" />
                        <h2 className="text-sm font-semibold text-white tracking-tight">AI Köməkçi</h2>
                    </div>
                    {feedback?.status && (
                        <span className={cn(
                            "status-badge scale-90",
                            feedback.status === "PASS" ? "text-emerald-400 border-emerald-900/50 bg-emerald-900/20" :
                                "text-rose-400 border-rose-900/50 bg-rose-900/20"
                        )}>
                            {feedback.status}
                        </span>
                    )}
                </div>

                <div className="p-4 flex-1">
                    <AIFeedback feedback={feedback} analyzing={analyzing} />
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
