import type { NextAuthOptions } from "next-auth";
import type { Profile } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../app/lib/models/UserModel";
import { connectDB } from "../app/lib/mongodb";
import {
  googleSignInDecision,
  normalizeEmail,
  normalizeName,
  readPassword,
} from "./auth-input";

type GoogleProfile = Profile & { email_verified?: boolean };

function accountUser(user: { id: string; email: string; name?: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
  };
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        try {
          const email = normalizeEmail(credentials?.email);
          const password = readPassword(credentials?.password);
          if (!email || !password) return null;
          await connectDB();
          const user = await getUserByEmail(email);
          if (!user?.password) return null;
          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) return null;
          return accountUser(user);
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const googleProfile = profile as GoogleProfile | undefined;
      if (googleProfile?.email_verified === false) return false;
      const email = normalizeEmail(googleProfile?.email);
      if (!email) return false;
      await connectDB();
      const existingUser = await getUserByEmail(email);
      const decision = googleSignInDecision(existingUser);
      if (decision === "deny") return false;
      if (decision === "create") {
        await createUser({
          name: normalizeName(googleProfile?.name) ?? "",
          email,
        });
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        await connectDB();
        const existingUser = await getUserByEmail(token.email);
        if (existingUser) {
          token.userId = existingUser.id;
          token.name = existingUser.name;
          token.email = existingUser.email;
        }
        return token;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          email: token.email as string,
          name: token.name as string | undefined,
          image: token.picture as string | undefined,
          userId: token.userId as string | undefined,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
