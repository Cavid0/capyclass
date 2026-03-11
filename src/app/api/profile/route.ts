import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { validateTextInput, verifyOtpToken } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

// GET: Get current user profile
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;

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
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Get profile error:", error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}

// PUT: Update profile
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = session.user.id;
        const { name, otp, newPassword } = await req.json();

        // Build update data
        const updateData: any = {};

        if (name !== undefined && name !== null && name !== "") {
            const validatedName = validateTextInput(name, { fieldName: "Name", maxLength: 100 });
            if (!validatedName.ok) {
                return NextResponse.json({ error: validatedName.error }, { status: 400 });
            }
            updateData.name = validatedName.value;
        }

        // Handle password change (OTP verified)
        if (newPassword) {
            if (!otp) {
                return NextResponse.json(
                    { error: "OTP code is required" },
                    { status: 400 }
                );
            }

            // Verify OTP with purpose and brute-force protection
            const otpResult = await verifyOtpToken(userId, otp, "PASSWORD_CHANGE");
            if (!otpResult.valid) {
                return NextResponse.json(
                    { error: otpResult.error },
                    { status: 400 }
                );
            }

            if (newPassword.length < 6) {
                return NextResponse.json(
                    { error: "New password must be at least 6 characters" },
                    { status: 400 }
                );
            }

            updateData.hashedPassword = await hash(newPassword, 12);
            await logAudit(userId, "PASSWORD_CHANGED", "User", userId);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No changes submitted" },
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
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
