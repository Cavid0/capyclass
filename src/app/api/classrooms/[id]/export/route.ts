import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Export classroom data as CSV (teacher only)
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const classroomId = params.id;

        const classroom = await prisma.classroom.findUnique({
            where: { id: classroomId },
            include: { admins: true },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        const isAdmin =
            classroom.teacherId === userId ||
            classroom.admins.some((a) => a.userId === userId);

        if (!isAdmin) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Fetch all student workspaces with student info
        const workspaces = await prisma.workspace.findMany({
            where: { classroomId },
            include: {
                student: { select: { name: true, email: true } },
            },
            orderBy: [
                { student: { name: "asc" } },
                { updatedAt: "desc" },
            ],
        });

        // Build CSV
        const headers = ["Student Name", "Student Email", "Workspace Title", "Language", "Status", "Review Status", "Review Note", "Created At", "Updated At"];
        const csvRows = [headers.join(",")];

        for (const w of workspaces) {
            const row = [
                escapeCsv(w.student.name || ""),
                escapeCsv(w.student.email || ""),
                escapeCsv(w.title),
                w.language,
                w.status,
                w.reviewStatus || "",
                escapeCsv(w.reviewNote || ""),
                w.createdAt.toISOString(),
                w.updatedAt.toISOString(),
            ];
            csvRows.push(row.join(","));
        }

        const csv = csvRows.join("\n");
        const filename = `${classroom.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.csv`;

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Export classroom error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

function escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
