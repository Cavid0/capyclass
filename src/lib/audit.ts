import { prisma } from "./prisma";

export async function logAudit(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: string
) {
    try {
        await prisma.auditLog.create({
            data: { userId, action, resourceType, resourceId, details },
        });
    } catch (error) {
        console.error("[AUDIT] Failed to log:", error);
    }
}
