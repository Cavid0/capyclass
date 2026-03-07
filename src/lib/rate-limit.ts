// In-memory rate limiter with sliding window and memory protection
// For production at scale, use Redis-based solution

const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_MAP_SIZE = 50_000; // Prevent memory exhaustion from DDoS

/**
 * Rate limiter — limits the maximum number of requests within a given time window
 * @param key - unique identifier (IP, email, user ID)
 * @param maxRequests - maximum number of requests allowed within the window
 * @param windowMs - window duration in milliseconds
 * @returns true if allowed, false if rate limit exceeded
 */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();

    // Memory protection: evict oldest entries if map is too large
    if (rateMap.size > MAX_MAP_SIZE) {
        const entriesToDelete: string[] = [];
        rateMap.forEach((v, k) => {
            if (now > v.resetAt) entriesToDelete.push(k);
        });
        entriesToDelete.forEach((k) => rateMap.delete(k));

        // If still too large after cleaning expired, remove oldest
        if (rateMap.size > MAX_MAP_SIZE) {
            const keys = Array.from(rateMap.keys());
            for (let i = 0; i < keys.length / 2; i++) {
                rateMap.delete(keys[i]);
            }
        }
    }

    const entry = rateMap.get(key);

    // Clean up expired entry
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

/** Get remaining time until rate limit resets (in seconds) */
export function getRateLimitReset(key: string): number {
    const entry = rateMap.get(key);
    if (!entry) return 0;
    const remaining = Math.max(0, entry.resetAt - Date.now());
    return Math.ceil(remaining / 1000);
}

// Clean up expired entries every 2 minutes
setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    rateMap.forEach((value, key) => {
        if (now > value.resetAt) keysToDelete.push(key);
    });
    keysToDelete.forEach((k) => rateMap.delete(k));
}, 2 * 60 * 1000);
