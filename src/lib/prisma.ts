import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function isConnectionClosedError(err: unknown): boolean {
    if (!err) return false;
    const message = err instanceof Error ? err.message : String(err);
    return (
        message.includes("Server has closed the connection") ||
        message.includes("Can't reach database server") ||
        message.includes("Connection terminated") ||
        message.includes("Connection refused") ||
        message.includes("ECONNRESET") ||
        message.includes("prepared statement") ||
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P1017") ||
        (err instanceof Prisma.PrismaClientInitializationError)
    );
}

function createPrismaClient() {
    const base = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        transactionOptions: {
            maxWait: 5000,
            timeout: 10000,
        },
    });

    return base.$extends({
        query: {
            async $allOperations({ args, query }) {
                let lastErr: unknown;
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        return await query(args);
                    } catch (err) {
                        lastErr = err;
                        if (!isConnectionClosedError(err)) throw err;
                        await base.$disconnect().catch(() => { });
                        await new Promise((r) => setTimeout(r, 50 + attempt * 100));
                    }
                }
                throw lastErr;
            },
        },
    });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (typeof process !== "undefined") {
    const cleanup = () => { void (prisma as any).$disconnect?.(); };
    process.on("beforeExit", cleanup);
}
