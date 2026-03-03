// Simple in-memory rate limiter
// For production, use Redis-based solution

const rateMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter — limits the maximum number of requests within a given time window
 * @param key - unique identifier (IP, email, user ID)
 * @param maxRequests - maximum number of requests allowed within the window
 * @param windowMs - window duration in milliseconds
 * @returns true if allowed, false if rate limit exceeded
 */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = rateMap.get(key);

    // Clean up expired entries
    if (entry && now > entry.resetAt) {
        rateMap.delete(key);
    }

    const current = rateMap.get(key);

    if (!current) {
        rateMap.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (current.count >= maxRequests) {
        return false;
    }

    current.count++;
    return true;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateMap.entries()) {
        if (now > value.resetAt) {
            rateMap.delete(key);
        }
    }
}, 5 * 60 * 1000);
