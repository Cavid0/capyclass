"use client";

import { motion } from "framer-motion";
import { Brain, ArrowRight, Terminal, Rocket, Layers } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f0ece4] selection:bg-amber-500/30 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Warm Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 blur-[120px] rounded-full mix-blend-screen" />
        </div>
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[400px] opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-700 blur-[130px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] shadow-lg backdrop-blur-md mb-8"
              >
                <span className="text-xs font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300 uppercase">
                  Təhsilin Gələcəyi Buradadır
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]"
              >
                Kodlaşdırmanı <br className="hidden md:block" />
                öyrənməyin {" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500">
                  ən asan
                </span> {" "} yolu
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg md:text-xl text-[#a8a08e] max-w-xl mx-auto lg:mx-0 mb-10 font-light leading-relaxed"
              >
                Dərslərinizi asanlıqla idarə edin, kodlaşdırma tapşırıqları verin və {" "}
                <span className="text-[#f0ece4] font-medium">real vaxt rəylər</span> alın.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start"
              >
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-3.5 bg-amber-500 text-[#0a0908] text-sm font-semibold rounded-2xl hover:bg-amber-400 transition-all shadow-[0_0_40px_rgba(232,168,73,0.25)] flex items-center justify-center gap-2 group"
                  >
                    <Terminal className="w-4 h-4" />
                    Başla
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-8 py-3.5 bg-transparent border border-[#2a2520] text-[#f0ece4] text-sm font-medium rounded-2xl hover:bg-white/[0.04] hover:border-[#3d362e] transition-all flex items-center justify-center gap-2"
                  >
                    Qeydiyyat
                  </motion.button>
                </Link>
              </motion.div>
            </div>

            {/* Right: Capybara Mascot */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 max-w-lg lg:max-w-xl relative"
            >
              <div className="absolute -inset-8 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
              <div className="relative rounded-3xl overflow-hidden border border-amber-500/15 shadow-[0_20px_60px_rgba(232,168,73,0.12)]">
                <Image
                  src="/capybara.png"
                  alt="CapyClass Mascot - Kod yazan Capybara"
                  width={800}
                  height={450}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {/* Decorative floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-3 -left-3 px-4 py-2 bg-[#141210] border border-amber-500/20 rounded-2xl shadow-lg backdrop-blur-md"
              >
                <span className="text-xs font-semibold text-amber-400">🧑‍💻 Kod yaz, öyrən!</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-20 px-6 max-w-6xl mx-auto pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-3xl bg-amber-500/[0.02] border border-amber-500/10 backdrop-blur-xl shadow-2xl"
        >
          {[
            { label: "Mühərrik", value: "Realtime", desc: "Sürətli kod analizi" },
            { label: "İzolyasiya", value: "100%", desc: "Mütləq təhlükəsizlik" },
            { label: "Editor", value: "Monaco", desc: "VS Code infrastrukturu" },
            { label: "Gecikmə", value: "< 2s", desc: "Real vaxt reaksiyalar" },
          ].map((stat, i) => (
            <div key={i} className="p-6 text-center rounded-2xl hover:bg-amber-500/[0.03] transition-colors border border-transparent hover:border-amber-500/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-transparent transition-all duration-500" />
              <div className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest mb-2 relative z-10">{stat.label}</div>
              <div className="text-2xl font-bold text-[#f0ece4] mb-1 tracking-tight relative z-10">{stat.value}</div>
              <div className="text-sm text-[#a8a08e] relative z-10">{stat.desc}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Showcase */}
      <section className="px-6 py-32 relative">
        <div className="absolute right-0 top-1/4 w-1/2 h-1/2 bg-amber-600/8 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center md:text-left mb-20 max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold text-[#f0ece4] mb-6 tracking-tight">
              Mükəmməl tədris mühiti <br />
              <span className="text-[#a8a08e]">tək platformada.</span>
            </h2>
            <p className="text-[#a8a08e] text-lg md:text-xl font-light leading-relaxed">
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
                className="group relative p-8 rounded-3xl bg-amber-500/[0.02] border border-amber-500/10 overflow-hidden hover:bg-amber-500/[0.05] transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/8 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-500/15 transition-all duration-500" />

                <div className="w-14 h-14 rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] flex items-center justify-center mb-8 relative z-10 group-hover:scale-110 group-hover:bg-amber-500/15 transition-all duration-500">
                  <feature.icon className="w-6 h-6 text-amber-400 group-hover:text-amber-300 transition-colors" />
                </div>

                <h3 className="text-2xl font-semibold text-[#f0ece4] mb-4 tracking-tight relative z-10">
                  {feature.title}
                </h3>
                <p className="text-[#a8a08e] text-base leading-relaxed relative z-10 group-hover:text-[#c4baa8] transition-colors">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="relative border-t border-amber-500/10 bg-[#080706] overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-amber-600/5 blur-[100px] rounded-t-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/20">
                <Image src="/capybara.png" alt="CapyClass" width={32} height={32} className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold text-[#f0ece4] tracking-tight">CapyClass</span>
            </div>

            <div className="flex gap-8 text-sm text-[#a8a08e] font-medium">
              <Link href="#" className="hover:text-[#f0ece4] transition-colors">Haqqımızda</Link>
              <Link href="#" className="hover:text-[#f0ece4] transition-colors">Xidmətlər</Link>
              <Link href="#" className="hover:text-[#f0ece4] transition-colors">Əlaqə</Link>
            </div>

            <p className="text-[#6b6355] text-sm">
              © 2026 CapyClass. Bütün hüquqlar qorunur.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
