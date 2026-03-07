import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Create a new workspace (repo/snippet) for the student in the classroom
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const role = session.user.role;
        const classroomId = params.id;

        if (role !== "STUDENT") {
            return NextResponse.json({ error: "Only students can create a workspace" }, { status: 403 });
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_classroomId: {
                    studentId: userId,
                    classroomId,
                },
            },
        });

        if (!enrollment) {
            return NextResponse.json({ error: "You are not enrolled in this classroom" }, { status: 403 });
        }

        const { title } = await req.json();

        const workspace = await prisma.workspace.create({
            data: {
                studentId: userId,
                classroomId,
                title: title || "My Code",
                code: "// New code\n",
                language: "javascript",
            },
        });

        return NextResponse.json(workspace, { status: 201 });
    } catch (error) {
        console.error("Create workspace error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
