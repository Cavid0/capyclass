import { NextRequest, NextResponse } from "next/server";

function createCsp(): string {
    return [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "frame-src 'none'",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
    ].join("; ");
}

// Global IP-based rate limiter for DDoS protection
const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

// Cleanup interval tracking
let lastCleanup = Date.now();

function getClientIp(req: NextRequest): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
}

function isRateLimited(ip: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();

    // Periodic cleanup every 60 seconds
    if (now - lastCleanup > 60_000) {
        lastCleanup = now;
        ipRequestMap.forEach((val, key) => {
            if (now > val.resetAt) ipRequestMap.delete(key);
        });
    }

    const entry = ipRequestMap.get(ip);
    if (!entry || now > entry.resetAt) {
        ipRequestMap.set(ip, { count: 1, resetAt: now + windowMs });
        return false;
    }

    entry.count++;
    return entry.count > maxRequests;
}

export function middleware(req: NextRequest) {
    const ip = getClientIp(req);
    const { pathname } = req.nextUrl;
    const requestHeaders = new Headers(req.headers);

    // Global rate limit: 200 requests per minute per IP for API routes
    if (pathname.startsWith("/api/")) {
        if (isRateLimited(`global:${ip}`, 200, 60_000)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }
    }

    // Stricter rate limit for auth endpoints: 30 requests per minute per IP
    if (pathname.startsWith("/api/auth/")) {
        if (isRateLimited(`auth:${ip}`, 30, 60_000)) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }
    }

    // Strict rate limit for code execution: 30 per minute per IP
    if (pathname === "/api/execute") {
        if (isRateLimited(`exec:${ip}`, 30, 60_000)) {
            return NextResponse.json(
                { error: "Too many execution requests. Please slow down." },
                { status: 429 }
            );
        }
    }

    if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const origin = req.headers.get("origin");
        if (origin && origin !== req.nextUrl.origin) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }
    }

    // Block suspicious patterns
    const suspiciousPatterns = [
        /\.\.\//,        // Path traversal
        /<script/i,      // XSS in URL
        /union\s+select/i, // SQL injection
        /%00/,           // Null byte injection
    ];

    const url = req.nextUrl.toString();
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }
    }

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Content-Security-Policy", createCsp());
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.headers.set("Origin-Agent-Cluster", "?1");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()");
    if (pathname.startsWith("/api/")) {
        response.headers.set("Cache-Control", "no-store, max-age=0");
        response.headers.set("Pragma", "no-cache");
    }

    return response;
}

export const config = {
    matcher: [
        // Match all API routes and pages, skip static files
        "/((?!_next/static|_next/image|favicon\\.png|capybara\\.png|robots\\.txt).*)",
    ],
};
