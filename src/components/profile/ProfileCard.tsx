"use client";

import { BookOpen, Calendar } from "lucide-react";

interface ProfileCardProps {
    profile: any;
}

export function ProfileCard({ profile }: ProfileCardProps) {
    const totalClasses = (profile?._count?.classrooms || 0) + (profile?._count?.enrollments || 0);

    return (
        <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-[var(--border-color)] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                        {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-white tracking-tight">
                        {profile?.name}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">{profile?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    </div>
                    <div className="text-lg font-bold text-white">{totalClasses}</div>
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Classrooms</div>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    </div>
                    <div className="text-sm font-bold text-white">
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Joined</div>
                </div>
            </div>
        </div>
    );
}
