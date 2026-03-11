"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Users, Code2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TeacherView } from "@/components/classroom/TeacherView";
import { StudentView } from "@/components/classroom/StudentView";

export default function ClassroomPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const [classroom, setClassroom] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const sessionIdRef = useRef<string | undefined>(undefined);
    useEffect(() => { sessionIdRef.current = session?.user?.id; }, [session?.user?.id]);

    const selectedWorkspaceIdRef = useRef<string | null>(null);
    const setSelectedWorkspaceBoth = useCallback((id: string | null) => {
        selectedWorkspaceIdRef.current = id;
        setSelectedWorkspaceId(id);
    }, []);

    const fetchClassroom = useCallback(async (isPolling = false) => {
        try {
            const res = await fetch(`/api/classrooms/${params.id}`, { cache: "no-store" });
            if (!res.ok) {
                if (res.status === 401) { router.push("/login"); return; }
                if (res.status === 403 || res.status === 404) { router.push("/dashboard"); return; }
                return;
            }
            const data = await res.json();
            setClassroom({
                ...data.classroom,
                workspaces: data.workspaces || [],
                enrollments: data.enrollments || [],
                admins: data.admins || [],
            });
            if (
                data.workspaces?.length > 0 &&
                !selectedWorkspaceIdRef.current &&
                data.classroom?.teacherId !== sessionIdRef.current
            ) {
                setSelectedWorkspaceBoth(data.workspaces[0].id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [params.id, router, setSelectedWorkspaceBoth]);

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
        if (status === "unauthenticated") { router.push("/login"); return; }
        if (status === "authenticated") {
            fetchClassroom();
            fetchTasks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const fetchClassroomRef = useRef(fetchClassroom);
    useEffect(() => { fetchClassroomRef.current = fetchClassroom; }, [fetchClassroom]);
    useEffect(() => {
        if (status === "authenticated" && classroom?.teacherId === sessionIdRef.current) {
            intervalRef.current = setInterval(() => fetchClassroomRef.current(true), 5000);
            return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
        }
    }, [status, classroom?.teacherId]);

    if (loading || status === "loading") {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex justify-center items-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!classroom) return null;

    const isTeacher =
        classroom.teacherId === session?.user?.id ||
        classroom.admins?.some((a: any) => a.userId === session?.user?.id);

    return (
        <div className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden">
            {/* Topbar */}
            <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between px-6 shrink-0">
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
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{classroom.enrollments?.length || 0}</span>
                        </div>
                        <div className="h-4 w-px bg-[var(--border-color)]" />
                        <div className="text-xs font-mono bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-1 rounded select-all">
                            {classroom.inviteCode}
                        </div>
                    </div>
                )}

                {!isTeacher && classroom.memberCount !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Users className="w-3.5 h-3.5" />
                        <span>{classroom.memberCount}</span>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <div className="flex-1 min-h-0">
                {isTeacher ? (
                    <TeacherView
                        classroom={classroom}
                        tasks={tasks}
                        selectedWorkspaceId={selectedWorkspaceId}
                        onSelectWorkspace={setSelectedWorkspaceBoth}
                        onTaskCreated={fetchTasks}
                        onRefresh={fetchClassroom}
                        currentUserId={session?.user?.id || ""}
                    />
                ) : (
                    <StudentView
                        classroomId={classroom.id}
                        workspaces={classroom.workspaces || []}
                        tasks={tasks}
                        currentUserId={session?.user?.id || ""}
                        selectedWorkspaceId={selectedWorkspaceId}
                        onSelectWorkspace={setSelectedWorkspaceBoth}
                        onWorkspaceCreated={fetchClassroom}
                    />
                )}
            </div>
        </div>
    );
}
