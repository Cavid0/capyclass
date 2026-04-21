/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    productionBrowserSourceMaps: false,
    reactStrictMode: true,
    compress: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
    },
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
