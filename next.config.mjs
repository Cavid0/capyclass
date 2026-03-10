/** @type {import('next').NextConfig} */
const nextConfig = {
    // Təhlükəsizlik üçün X-Powered-By başlığını bağlayırıq (Next.js/Express işlətdiyimizin görünməməsi üçün)
    poweredByHeader: false,
    // Source map fayllarının production mühitində yaranmasının qarşısını alırıq (Hackers source code-u oxumasın deyə)
    productionBrowserSourceMaps: false,
    // Xüsusi HTTP təhlükəsizlik başlıqlarını əlavə edirik
    async headers() {
        return [
            {
                // Bütün fayllara və səhifələrə tətbiq olunur
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://wandbox.org https://cdn.jsdelivr.net; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
                    },
                    {
                        // Cross-Origin resursları izolyasiya edir
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=()'
                    },
                    {
                        key: 'X-Permitted-Cross-Domain-Policies',
                        value: 'none'
                    },
                ]
            }
        ];
    }
};

export default nextConfig;
