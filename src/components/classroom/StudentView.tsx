"use client";

import { useState, useEffect } from "react";
import {
    ChevronLeft, Plus, ClipboardList, FileCode, Save, Folder,
    Loader2, CheckCircle, ThumbsUp, ThumbsDown, Play, Terminal,
    X, Trash2, Calendar
} from "lucide-react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DEFAULT_CODE: Record<string, string> = {
    javascript: 'console.log("Hello, World!");\n// Add your code here',
    typescript: 'console.log("Hello, TypeScript!");\n// Add your code here',
    python: 'print("Hello, World!")\n# Add your code here',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    // Add your code here\n    return 0;\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    // Add your code here\n    return 0;\n}',
    csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n        // Add your code here\n    }\n}',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n        // Add your code here\n    }\n}',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n    // Add your code here\n}',
    ruby: 'puts "Hello, World!"\n# Add your code here',
    php: '<?php\n\necho "Hello, World!";\n// Add your code here\n?>',
    rust: 'fn main() {\n    println!("Hello, World!");\n    // Add your code here\n}',
    swift: 'print("Hello, World!")\n// Add your code here',
};

const LANGUAGES = [
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "java", label: "Java" },
    { value: "go", label: "Go" },
    { value: "ruby", label: "Ruby" },
    { value: "php", label: "PHP" },
    { value: "rust", label: "Rust" },
    { value: "swift", label: "Swift" },
];

const normalizeWorkspaceCode = (value: string | null | undefined) =>
    value?.replace(/^(?:[ \t]*\r?\n)+/, "") ?? "";

interface StudentViewProps {
    classroomId: string;
    workspaces: any[];
    tasks: any[];
    currentUserId: string;
    selectedWorkspaceId: string | null;
    onSelectWorkspace: (id: string | null) => void;
    onWorkspaceCreated: () => void;
}

export function StudentView({ classroomId, workspaces, tasks, selectedWorkspaceId, onSelectWorkspace, onWorkspaceCreated }: StudentViewProps) {
    const activeWorkspace = workspaces.find((w: any) => w.id === selectedWorkspaceId);

    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [activeTab, setActiveTab] = useState<"files" | "tasks">("tasks");
    const [creatingFile, setCreatingFile] = useState(false);
    const [viewingTask, setViewingTask] = useState<any>(null);

    // Output
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState<string | null>(null);
    const [outputError, setOutputError] = useState(false);
    const [showOutput, setShowOutput] = useState(false);

    // New file modal
    const [showNewFileModal, setShowNewFileModal] = useState(false);
    const [newFileName, setNewFileName] = useState("");

    // Language change warning modal
    const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);

    // Sync editor when workspace changes
    useEffect(() => {
        if (activeWorkspace) {
            const initialLang = activeWorkspace.language || "javascript";
            setLanguage(initialLang);
            setCode(activeWorkspace.code?.trim() ? normalizeWorkspaceCode(activeWorkspace.code) : DEFAULT_CODE[initialLang] || "");
        } else {
            setCode("");
        }
    }, [activeWorkspace?.id, activeWorkspace]);

    /* ── Helpers ── */

    const handleLanguageChange = (newLang: string) => {
        const oldCode = code.trim();
        const defaultCodeVals = Object.values(DEFAULT_CODE).map(c => c.trim());
        const isDefault = !oldCode ||
            defaultCodeVals.includes(oldCode) ||
            oldCode === '// New code' ||
            oldCode === 'console.log("Hello, World!");';

        if (isDefault) {
            setLanguage(newLang);
            setCode(DEFAULT_CODE[newLang] || "");
        } else {
            // Əgər dəyişilmiş kod varsa, popup göstəririk
            setPendingLanguage(newLang);
        }
    };

    const confirmLanguageChange = () => {
        if (pendingLanguage) {
            setLanguage(pendingLanguage);
            setCode(DEFAULT_CODE[pendingLanguage] || "");
            setPendingLanguage(null);
        }
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleString("az-AZ", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        });

    /* ── API Handlers ── */

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
            onWorkspaceCreated();
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!activeWorkspace) return;
        toast("Are you sure you want to delete this file?", {
            action: {
                label: "Yes, Delete",
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
                },
            },
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

    /* ── Render ── */

    return (
        <div className="flex flex-col md:flex-row h-full">
            {/* ─── Sidebar ─── */}
            <aside
                className={cn(
                    "w-full md:w-72 border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] shrink-0",
                    selectedWorkspaceId ? "hidden md:flex" : "flex"
                )}
            >
                {/* Tab Header */}
                <div className="flex border-b border-[var(--border-color)] shrink-0">
                    {(["tasks", "files"] as const).map((tab) => (
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
                            {tab === "tasks" ? <ClipboardList className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                            {tab === "tasks" ? "Tasks" : "My Files"}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]">
                    {activeTab === "tasks" ? (
                        <div className="p-2 space-y-1.5">
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
                                        className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] cursor-pointer hover:border-[var(--border-hover)] transition-all"
                                    >
                                        <h4 className="text-sm font-medium text-white leading-snug">{t.title}</h4>
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
                        <div className="p-2 space-y-0.5">
                            <button
                                onClick={() => setShowNewFileModal(true)}
                                disabled={creatingFile}
                                className="w-full p-2.5 rounded-lg mb-1.5 text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center justify-center gap-2 border border-dashed border-[var(--border-color)] hover:border-[var(--border-hover)]"
                            >
                                {creatingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                New File
                            </button>

                            {workspaces.map((w: any) => {
                                const hasReview = w.reviewStatus;
                                const isActive = selectedWorkspaceId === w.id;

                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => onSelectWorkspace(w.id)}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-md text-sm transition-all flex items-center justify-between border",
                                            isActive
                                                ? "bg-[var(--bg-card)] border-[var(--border-color)] text-white"
                                                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white"
                                        )}
                                    >
                                        <span className="flex items-center gap-2 truncate min-w-0">
                                            <FileCode className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                            <span className="truncate">{w.title}</span>
                                        </span>
                                        {hasReview && (
                                            <span className={cn(
                                                "w-1.5 h-1.5 rounded-full shrink-0 ml-2",
                                                w.reviewStatus === "CORRECT" ? "bg-emerald-400" : "bg-red-400"
                                            )} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            {/* ─── Editor Area ─── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg-primary)]">
                {activeWorkspace ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-11 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-4 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => onSelectWorkspace(null)} className="md:hidden text-[var(--text-secondary)] hover:text-white">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="text-sm font-medium text-white flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-2.5 py-1 rounded truncate">
                                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                                    {activeWorkspace.title}
                                </div>
                                <select
                                    value={language}
                                    onChange={(e) => {
                                        // Dropdown-ın öz head hissəsindəki dəyərin dərhal dəyişməsinin 
                                        // qarşısını almaq üçün bu sadəcə state ilə react edəcək.
                                        handleLanguageChange(e.target.value);
                                    }}
                                    className="bg-transparent border-none text-[var(--text-secondary)] text-xs outline-none cursor-pointer hover:text-white [&>option]:bg-[var(--bg-card)] [&>option]:text-white"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={cn(
                                        "px-3 py-1.5 text-xs flex items-center gap-1.5 rounded transition-all",
                                        saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "glow-btn"
                                    )}
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
                                </button>

                                {language !== "html" && (
                                    <button
                                        onClick={handleRun}
                                        disabled={running}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                    >
                                        {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                        Run
                                    </button>
                                )}

                                <button
                                    onClick={handleDeleteWorkspace}
                                    className="p-1.5 text-xs rounded transition-all text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10"
                                    title="Delete file"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Editor + Output */}
                        <div className={cn("flex-1 flex flex-col overflow-hidden", showOutput && "flex-[2]")}>
                            <div className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-primary)]">
                                <CodeEditor
                                    key={activeWorkspace ? `${activeWorkspace.id}-${language}` : language}
                                    value={code}
                                    onChange={(val) => setCode(val || "")}
                                    language={language}
                                />
                            </div>

                            {showOutput && (
                                <div className="shrink-0 border-t border-[var(--border-color)] bg-[#010409] flex flex-col" style={{ height: "200px" }}>
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shrink-0">
                                        <div className="flex items-center gap-2 text-xs">
                                            <Terminal className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                                            <span className="text-[var(--text-secondary)] font-medium uppercase tracking-wider">Output</span>
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
                                                Running...
                                            </div>
                                        ) : output !== null ? (
                                            <pre className={cn("text-xs font-mono whitespace-pre-wrap leading-relaxed", outputError ? "text-red-400" : "text-emerald-300")}>{output}</pre>
                                        ) : (
                                            <p className="text-xs text-[var(--text-secondary)]">Press Run to execute</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Review Banner */}
                        {activeWorkspace.reviewStatus && (
                            <div
                                className={cn(
                                    "shrink-0 border-t px-4 py-2.5 flex items-center gap-3 relative z-10",
                                    activeWorkspace.reviewStatus === "CORRECT"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                )}
                            >
                                {activeWorkspace.reviewStatus === "CORRECT" ? <ThumbsUp className="w-4 h-4 shrink-0" /> : <ThumbsDown className="w-4 h-4 shrink-0" />}
                                <span className="text-sm font-medium">
                                    {activeWorkspace.reviewStatus === "CORRECT" ? "Correct ✓" : "Incorrect ✗"}
                                </span>
                                {activeWorkspace.reviewNote && (
                                    <span className="text-xs opacity-80 ml-1">— {activeWorkspace.reviewNote}</span>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <Folder className="w-12 h-12 mb-3 opacity-15" />
                        <p className="text-sm">Select a file or create a new one</p>
                    </div>
                )}
            </main>

            {/* ─── New File Modal ─── */}
            {showNewFileModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewFileModal(false)}>
                    <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-white mb-4">New File</h3>
                        <form onSubmit={submitCreateFile} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                placeholder="File name..."
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                className="input-field"
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setShowNewFileModal(false)} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!newFileName.trim()} className="glow-btn px-4 py-2 text-sm">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Language Change Warning Modal (Yeni Popup) ─── */}
            {pendingLanguage && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPendingLanguage(null)}>
                    <div className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-[var(--accent-primary)]" />
                            Dili Dəyişmək
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                            Dili <strong>{pendingLanguage}</strong> olaraq dəyişdiyiniz zaman mövcud kodlarınız silinəcək və yeni dilə aid şablon kod yüklənəcək. Davam etmək istəyirsiniz?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setPendingLanguage(null)} className="px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-all">
                                Ləğv et
                            </button>
                            <button onClick={confirmLanguageChange} className="px-5 py-2 rounded-lg text-sm bg-[var(--accent-primary)] text-[var(--btn-text)] font-medium hover:brightness-110 transition-all shadow-[0_0_15px_var(--accent-glow)]">
                                Bəli, Sil və Dəyiş
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Task View Modal ─── */}
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

                        <div className="shrink-0 pt-4 mt-3 border-t border-[var(--border-color)] text-right">
                            <button onClick={() => setViewingTask(null)} className="glow-btn px-6 py-2 text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
