"use client";

import { motion } from "framer-motion";
import { BookOpen, Code2, Brain, Shield, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";

export default function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-32 pb-24 border-b border-[var(--border-color)]">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-white/[0.03] blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 pt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 border border-[var(--border-color)] bg-[var(--bg-card)] rounded-full px-4 py-1.5 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)] font-medium tracking-wide uppercase">AI-Köməkçi ilə Təhsil</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white leading-[1.1]">
              Gələcəyin <br className="hidden md:block" />
              <span className="text-[var(--text-secondary)]">Proqramçıları</span> üçün
            </h1>

            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Sinifləri idarə edin. Təcrid olunmuş mühitlərdə tapşırıqlar verin.
              Süni intellekt köməyilə tələbələrin inkişafını avtomatlaşdırın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={session ? "/dashboard" : "/register"}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glow-btn px-7 py-3 text-sm flex items-center gap-2"
                >
                  {session ? "Panelə Keç" : "Pulsuz Hesab Yarat"}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="secondary-btn px-7 py-3 text-sm flex items-center gap-2"
                >
                  Sistemə Giriş
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "AI Mühərrik", value: "Gemini 1.5", desc: "Sürətli Analiz" },
            { label: "Mühit", value: "Tam İzolasiya", desc: "Sıfır Kopya" },
            { label: "İnterfeys", value: "Monaco", desc: "Pro Editor" },
            { label: "Sürət", value: "< 2 san", desc: "Real vaxt rəylər" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="text-center md:text-left"
            >
              <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{stat.label}</div>
              <div className="text-xl font-semibold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-[var(--text-secondary)]">{stat.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 bg-black grid-pattern">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Niyə ClassFlow?</h2>
            <p className="text-[var(--text-secondary)] max-w-xl">
              Adi LMS sistemlərindən fərqli olaraq biz inkişafa fokuslanırıq.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Sadə Sinif İdarəetməsi",
                desc: "1 kliklə sinif yaradın. Unikal linkləri paylaşın. Tələbələr dərhal workspace-ə yerləşir.",
              },
              {
                icon: Shield,
                title: "Mütləq Təhlükəsizlik",
                desc: "Hər tələbə üçün ayrıca və digərlərinə qapalı (Private Isolation) proqramlaşdırma mühiti.",
              },
              {
                icon: Brain,
                title: "Fasiləsiz AI Məsləhətləri",
                desc: "Süni intellekt hər saniyə kodu analiz edir. Səhvləri uşaq dilində izah edir.",
              },
              {
                icon: Code2,
                title: "Sənaye Standartı Editor",
                desc: "VS Code infrastrukturunda işləyən Monaco editoru. Avtamamlama və real sintaksis rəngləmə.",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, ease: "easeOut" }}
                className="glass-card p-8 group"
              >
                <div className="w-10 h-10 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-center mb-6 text-white group-hover:bg-white group-hover:text-black transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">ClassFlow</span>
          </div>
          <p className="text-[var(--text-secondary)] text-xs">
            © 2026 Bütün hüquqlar qorunur.
          </p>
        </div>
      </footer>
    </div>
  );
}
