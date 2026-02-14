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
        token.role = (user as { role: string }).role;
        token.branchId = (user as { branchId?: string }).branchId;
        token.branchName = (user as { branchName?: string }).branchName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as "owner" | "branch") ?? "branch";
        session.user.branchId = token.branchId as string | undefined;
        session.user.branchName = token.branchName as string | undefined;
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
    role: "owner" | "branch";
    branchId?: string;
    branchName?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: "owner" | "branch";
      branchId?: string;
      branchName?: string;
    };
  }
}
