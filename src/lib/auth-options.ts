import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../app/lib/models/UserModel";
import { connectDB } from "../app/lib/mongodb";

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
          await connectDB();
          const user = await getUserByEmail(credentials?.email ?? "");
          if (!user?.password) return null;
          const isValidPassword = await bcrypt.compare(
            credentials?.password ?? "",
            user.password
          );
          if (!isValidPassword) return null;
          return user;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = profile?.email;
      if (!email) return false;
      await connectDB();
      const existingUser = await getUserByEmail(email);
      if (!existingUser) {
        await createUser({
          name: profile.name ?? "",
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
