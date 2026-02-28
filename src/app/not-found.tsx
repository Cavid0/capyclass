import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 text-center border border-[var(--border-color)]">
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-white mb-3">Səhifə tapılmadı</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-8">
                    Axtardığınız səhifə mövcud deyil və ya silinib.
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
