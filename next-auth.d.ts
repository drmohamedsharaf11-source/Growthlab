import { Role } from "@prisma/client";
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    clientId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    clientId: string | null;
  }
}
