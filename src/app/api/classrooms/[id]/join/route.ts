import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Student joins a classroom via invite code
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const role = (session.user as any).role;

        if (role !== "STUDENT") {
            return NextResponse.json(
                { error: "Yalnız tələbələr sinifə qoşula bilər" },
                { status: 403 }
            );
        }

        const classroom = await prisma.classroom.findUnique({
            where: { inviteCode: params.id },
        });

        if (!classroom) {
            return NextResponse.json({ error: "Sinif tapılmadı" }, { status: 404 });
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                studentId_classroomId: {
                    studentId: userId,
                    classroomId: classroom.id,
                },
            },
        });

        if (existingEnrollment) {
            return NextResponse.json({
                message: "Artıq bu sinifə qoşulmusunuz",
                classroomId: classroom.id,
            });
        }

        // Create enrollment and workspace in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const enrollment = await tx.enrollment.create({
                data: {
                    studentId: userId,
                    classroomId: classroom.id,
                },
            });

            const workspace = await tx.workspace.create({
                data: {
                    studentId: userId,
                    classroomId: classroom.id,
                    title: "Əsas fayl",
                    code: getStarterCode(classroom.name),
                    language: "javascript",
                },
            });

            return { enrollment, workspace };
        });

        return NextResponse.json(
            {
                message: "Sinifə uğurla qoşuldunuz!",
                classroomId: classroom.id,
                workspaceId: result.workspace.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Join classroom error:", error);
        return NextResponse.json(
            { error: "Sinifə qoşularkən xəta baş verdi" },
            { status: 500 }
        );
    }
}

function getStarterCode(classroomName: string): string {
    return `// ${classroomName} - Tapşırıq
// Xoş gəldiniz! Kodunuzu buraya yazın.
// AI sizin kodunuzu analiz edəcək və kömək edəcək 🚀

function salam() {
  console.log("Salam, dünya!");
}

salam();
`;
}
