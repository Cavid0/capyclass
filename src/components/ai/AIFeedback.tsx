"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, AlertCircle, Bot, Zap } from "lucide-react";

interface AIFeedbackProps {
    feedback: {
        summary: string;
        errors: string[];
        suggestions: string[];
        status: "PASS" | "FAIL";
    } | null;
    analyzing?: boolean;
}

export function AIFeedback({ feedback, analyzing = false }: AIFeedbackProps) {
    return (
        <div className="w-full relative min-h-[300px]">
            <AnimatePresence mode="wait">
                {analyzing ? (
                    <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse" />
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center relative z-10">
                                <Bot className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white tracking-tight mb-2">
                            Süni İntellekt analiz edir...
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Kodunuz sətir-bəsətir yoxlanılır. Bir saniyə gözləyin! 🚀
                        </p>
                    </motion.div>
                ) : feedback ? (
                    <motion.div
                        key="feedback"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Status Header */}
                        <div className={`p-4 rounded-lg border flex gap-4 ${feedback.status === "PASS"
                            ? "bg-emerald-900/10 border-emerald-900/30"
                            : "bg-rose-900/10 border-rose-900/30"
                            }`}>
                            <div className="mt-1">
                                {feedback.status === "PASS" ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-rose-500" />
                                )}
                            </div>
                            <div>
                                <h4 className={`text-sm font-semibold mb-1 ${feedback.status === "PASS" ? "text-emerald-400" : "text-rose-400"
                                    }`}>
                                    {feedback.status === "PASS" ? "Əla İş!" : "Düzəliş lazımdır"}
                                </h4>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {feedback.summary}
                                </p>
                            </div>
                        </div>

                        {/* Errors */}
                        {feedback.errors && feedback.errors.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-2 uppercase tracking-wider">
                                    <AlertCircle className="w-3.5 h-3.5" /> Nəyi düzəltməli?
                                </h4>
                                <div className="space-y-2">
                                    {feedback.errors.map((err, i) => (
                                        <div key={i} className="p-3 bg-rose-900/5 border border-rose-900/20 rounded-md text-sm text-[var(--text-secondary)] flex gap-3">
                                            <span className="text-rose-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            <span className="leading-relaxed">{err}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        {feedback.suggestions && feedback.suggestions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
                                    <Lightbulb className="w-3.5 h-3.5" /> Necə daha yaxşı olar?
                                </h4>
                                <div className="space-y-2">
                                    {feedback.suggestions.map((sug, i) => (
                                        <div key={i} className="p-3 bg-emerald-900/5 border border-emerald-900/20 rounded-md text-sm text-[var(--text-secondary)] flex gap-3">
                                            <span className="text-emerald-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            <span className="leading-relaxed">{sug}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex items-center gap-2 justify-center text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-semibold opacity-50">
                            <Zap className="w-3 h-3" /> AI tərəfindən generasiya edildi
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] text-center p-6"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                            <Bot className="w-8 h-8 text-[var(--text-secondary)] opacity-50" />
                        </div>
                        <p className="text-sm">Kodu yazın və yuxarıdakı<br />&quot;Saxla &amp; Analiz Et&quot; düyməsini sıxın.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
