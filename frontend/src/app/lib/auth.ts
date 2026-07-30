import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Dynamic import to avoid Edge Runtime issues in middleware
        const { verifyCredentials } = await import("./auth-db");
        return verifyCredentials(email, password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = (user as { id: string }).id;
        token.email = (user as { email: string }).email;
        token.role = (user as { role: "owner" | "branch" | "terminal" }).role;
        token.branchId = (user as { branchId?: string }).branchId;
        token.branchName = (user as { branchName?: string }).branchName;
        token.terminalId = (user as { terminalId?: string }).terminalId;
      } else if (token.role === "branch") {
        // Keep branchId aligned with DB (avoids stale UUIDs after migrate/seed/reset).
        const { db } = await import("./db");
        let acc = await db.branchAccount.findUnique({
          where: { id: token.sub as string },
          include: { branch: true },
        });
        if (!acc && token.email) {
          acc = await db.branchAccount.findUnique({
            where: { email: (token.email as string).trim().toLowerCase() },
            include: { branch: true },
          });
        }
        if (acc) {
          token.sub = acc.id;
          token.branchId = acc.branchId;
          token.branchName = acc.branch.name;
        } else {
          token.branchId = undefined;
          token.branchName = undefined;
        }
      } else if (token.role === "terminal") {
        const { db } = await import("./db");
        const terminalId =
          (token.terminalId as string | undefined) || (token.sub as string);
        const terminal = await db.terminal.findUnique({
          where: { id: terminalId },
          include: { branch: true },
        });
        if (!terminal || terminal.revokedAt) {
          token.branchId = undefined;
          token.branchName = undefined;
          token.terminalId = undefined;
          token.role = "terminal";
        } else {
          token.sub = terminal.id;
          token.terminalId = terminal.id;
          token.branchId = terminal.branchId;
          token.branchName = terminal.branch.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role =
          (token.role as "owner" | "branch" | "terminal") ?? "branch";
        session.user.branchId = token.branchId as string | undefined;
        session.user.branchName = token.branchName as string | undefined;
        session.user.terminalId = token.terminalId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

// Type augmentation for session
declare module "next-auth" {
  interface User {
    role: "owner" | "branch" | "terminal";
    branchId?: string;
    branchName?: string;
    terminalId?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: "owner" | "branch" | "terminal";
      branchId?: string;
      branchName?: string;
      terminalId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "owner" | "branch" | "terminal";
    branchId?: string;
    branchName?: string;
    terminalId?: string;
  }
}
