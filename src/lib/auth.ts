import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { isValidEmail, normalizeEmail } from "./utils";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const normalizedEmail = normalizeEmail(credentials.email);
                if (!isValidEmail(normalizedEmail)) {
                    throw new Error("Invalid email or password");
                }

                const user = await prisma.user.findUnique({
                    where: { email: normalizedEmail },
                });

                // Always compare against a fixed hash if user missing to keep timing constant
                const hashToCompare = user?.hashedPassword
                    || "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduu";
                const isPasswordValid = await compare(credentials.password, hashToCompare);

                if (!user || !isPasswordValid) {
                    throw new Error("Invalid email or password");
                }

                if (!user.emailVerified) {
                    throw new Error("Your email has not been verified yet. Please check your inbox.");
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 6 * 60 * 60, // 6 hours
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production"
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
