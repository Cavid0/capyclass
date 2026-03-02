import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// GET: Get current user profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        classrooms: true,
                        enrollments: true,
                        workspaces: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Get profile error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}

// PUT: Update profile
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Giriş tələb olunur" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { name, otp, newPassword } = await req.json();

        // Build update data
        const updateData: any = {};

        if (name && name.trim()) {
            updateData.name = name.trim();
        }

        // Handle password change (OTP verified)
        if (newPassword) {
            if (!otp) {
                return NextResponse.json(
                    { error: "OTP kodu tələb olunur" },
                    { status: 400 }
                );
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                return NextResponse.json({ error: "İstifadəçi tapılmadı" }, { status: 404 });
            }

            if (user.verificationToken !== otp) {
                return NextResponse.json(
                    { error: "OTP kodu yanlışdır" },
                    { status: 400 }
                );
            }

            if (newPassword.length < 6) {
                return NextResponse.json(
                    { error: "Yeni şifrə minimum 6 simvol olmalıdır" },
                    { status: 400 }
                );
            }

            updateData.hashedPassword = await hash(newPassword, 12);
            updateData.verificationToken = null;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "Heç bir dəyişiklik göndərilməyib" },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Update profile error:", error);
        return NextResponse.json({ error: "Xəta baş verdi" }, { status: 500 });
    }
}
