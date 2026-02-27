"use client";

import { motion } from "framer-motion";
import { BookOpen, Code2, Brain, Shield, ArrowRight, Sparkles, Terminal, Rocket, Layers } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 blur-[100px] rounded-full mix-blend-screen" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[400px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-blue-600 blur-[120px] rounded-full" />
        </div>

        {/* Grid Pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none bg-[length:40px_40px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] shadow-lg backdrop-blur-md mb-8"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 uppercase">
              Təhsilin Gələcəyi Buradadır
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-8 leading-[1.05]"
          >
            Kodlaşdırmanı öyrənməyin <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 pb-2 inline-block">
              ən innovativ
            </span> {" "} yolu
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed"
          >
            Dərslərinizi asanlıqla idarə edin. Xüsusi mühitlərdə kodlaşdırma tapşırıqları verin və {" "}
            <span className="text-white font-medium">Avtomatlaşdırılmış sistemimiz</span> ilə real vaxt rəylər alın.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-5 items-center justify-center w-full sm:w-auto"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 group"
              >
                Ödənişsiz Başla
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 bg-white/[0.05] border border-white/10 text-white text-sm font-medium rounded-2xl hover:bg-white/[0.1] backdrop-blur-sm transition-all flex items-center justify-center gap-2 group"
              >
                <Terminal className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Hesaba Daxil Ol
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section with Glassmorphism */}
      <section className="relative z-20 -mt-10 px-6 max-w-6xl mx-auto pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl"
        >
          {[
            { label: "Mühərrik", value: "Realtime", desc: "Sürətli kod analizi" },
            { label: "İzolyasiya", value: "100%", desc: "Mütləq təhlükəsizlik" },
            { label: "Editor", value: "Monaco", desc: "VS Code infrastrukturu" },
            { label: "Gecikmə", value: "< 2s", desc: "Real vaxt reaksiyalar" },
          ].map((stat, i) => (
            <div key={i} className="p-6 text-center rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-500" />
              <div className="text-xs font-semibold text-indigo-400/80 uppercase tracking-widest mb-2 relative z-10">{stat.label}</div>
              <div className="text-2xl font-bold text-white mb-1 tracking-tight relative z-10">{stat.value}</div>
              <div className="text-sm text-gray-500 relative z-10">{stat.desc}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Showcase */}
      <section className="px-6 py-32 relative">
        <div className="absolute right-0 top-1/4 w-1/2 h-1/2 bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center md:text-left mb-20 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Mükəmməl tədris mühiti <br />
              <span className="text-gray-500">tək platformada.</span>
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed">
              Ənənəvi dərslərdən gələcəyə addımlayın. Tələbələriniz üçün sürətli, ağıllı və kəsintisiz bir tədris təcrübəsi yaradın.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                title: "Sadə İdarəetmə",
                desc: "Cəmi bir kliklə sinif yaradın. Unikal linkləri paylaşaraq tələbələri dərhal proqramlaşdırma mühitinə daxil edin.",
                delay: 0.1,
              },
              {
                icon: Brain,
                title: "Fasiləsiz Dəstək",
                desc: "Sistem hər saniyə yazılan kodu analiz edir. Səhvləri aşkar edib asan anlaşılan dildə izah edir.",
                delay: 0.2,
              },
              {
                icon: Rocket,
                title: "Sənaye Standartı",
                desc: "VS Code infrastrukturunda işləyən Monaco editoru ilə inkişaf etmiş avtamamlama və sintaksis rəngləməsindən yararlanın.",
                delay: 0.3,
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: feature.delay, ease: "easeOut" }}
                className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/20 transition-all duration-500" />

                <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-indigo-300 group-hover:text-indigo-400 transition-colors" />
                </div>

                <h3 className="text-2xl font-semibold text-white mb-4 tracking-tight relative z-10">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-base leading-relaxed relative z-10 group-hover:text-gray-300 transition-colors">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="relative border-t border-white/10 bg-[#050505] overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-600/5 blur-[100px] rounded-t-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">ClassFlow</span>
            </div>

            <div className="flex gap-8 text-sm text-gray-400 font-medium">
              <Link href="#" className="hover:text-white transition-colors">Haqqımızda</Link>
              <Link href="#" className="hover:text-white transition-colors">Xidmətlər</Link>
              <Link href="#" className="hover:text-white transition-colors">Əlaqə</Link>
            </div>

            <p className="text-gray-500 text-sm">
              © 2026 ClassFlow. Bütün hüquqlar qorunur.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
