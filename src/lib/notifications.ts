import { prisma } from "./prisma";

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string
) {
    try {
        await prisma.notification.create({
            data: { userId, type, title, message, link },
        });
    } catch (error) {
        console.error("[NOTIFICATION] Failed to create:", error);
    }
}

export async function notifyMany(
    userIds: string[],
    type: string,
    title: string,
    message: string,
    link?: string
) {
    if (userIds.length === 0) return;
    try {
        await prisma.notification.createMany({
            data: userIds.map((userId) => ({ userId, type, title, message, link })),
        });
    } catch (error) {
        console.error("[NOTIFICATION] Failed to create bulk:", error);
    }
}
