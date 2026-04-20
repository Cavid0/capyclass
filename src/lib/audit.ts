import { prisma } from "./prisma";

export function logAudit(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: string
): void {
    void prisma.auditLog
        .create({ data: { userId, action, resourceType, resourceId, details } })
        .catch((error) => console.error("[AUDIT] Failed to log:", error));
}
