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
      // Add branchId to token on login
      if (user) {
        token.branchId = user.branchId;
        token.branchName = user.branchName;
      }
      return token;
    },
    async session({ session, token }) {
      // Add branchId to session
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.branchId = token.branchId as string;
        session.user.branchName = token.branchName as string;
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
    branchId: string;
    branchName: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      branchId: string;
      branchName: string;
    };
  }
}

// Extended JWT type (used internally)
export interface ExtendedJWT {
  branchId?: string;
  branchName?: string;
  sub?: string;
}
