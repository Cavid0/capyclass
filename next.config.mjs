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
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://wandbox.org; worker-src 'self' blob:; frame-src 'none'; manifest-src 'self'"
                    },
                    {
                        // Cross-Origin resursları izolyasiya edir
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()'
                    },
                    {
                        key: 'X-Permitted-Cross-Domain-Policies',
                        value: 'none'
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Cross-Origin-Resource-Policy',
                        value: 'same-origin'
                    },
                    {
                        key: 'Origin-Agent-Cluster',
                        value: '?1'
                    },
                ]
            }
        ];
    }
};

export default nextConfig;
