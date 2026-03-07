import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface User extends DefaultUser {
        id: string;
        role: "TEACHER" | "STUDENT";
    }

    interface Session {
        user: {
            id: string;
            role: "TEACHER" | "STUDENT";
            name?: string | null;
            email?: string | null;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string;
        role: "TEACHER" | "STUDENT";
    }
}
