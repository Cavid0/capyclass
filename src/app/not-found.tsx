import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Warm ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-md w-full text-center">
                {/* Capybara with glow */}
                <div className="relative mb-8 inline-block">
                    <div className="absolute -inset-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 blur-3xl rounded-full pointer-events-none" />
                    <Image
                        src="/capybara.png"
                        alt="Capybara mascot"
                        width={280}
                        height={158}
                        className="rounded-2xl mx-auto relative z-10 border border-amber-500/15 shadow-[0_12px_40px_rgba(232,168,73,0.1)]"
                    />
                </div>

                <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-500 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Səhifə tapılmadı</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                    Capybara hər yeri axtardı amma bu səhifəni tapa bilmədi 🔍
                </p>
                <Link
                    href="/"
                    className="glow-btn inline-block px-6 py-2.5 text-sm font-medium w-full"
                >
                    Ana Səhifəyə Qayıt
                </Link>
            </div>
        </div>
    );
}
