import { NextRequest, NextResponse } from "next/server";

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

    const response = NextResponse.next();

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    return response;
}

export const config = {
    matcher: [
        // Match all API routes and pages, skip static files
        "/((?!_next/static|_next/image|favicon\\.png|capybara\\.png|robots\\.txt).*)",
    ],
};
