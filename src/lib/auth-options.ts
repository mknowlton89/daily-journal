import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../app/lib/models/UserModel";
import { connectDB } from "../app/lib/mongodb";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        console.log("Authorizing credentials:", credentials);
        try {
          await connectDB();
          const user = await getUserByEmail(credentials?.email ?? "");
          if (!user) {
            throw new Error("");
          }
          const isValidPassword = await bcrypt.compare(
            credentials?.password ?? "",
            user.password as string
          );
          if (!isValidPassword) {
            throw new Error("Invalid password");
          }
          return user;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "github" && profile) {
        await connectDB();
        const existingUser = await getUserByEmail(profile.email ?? "");
        if (!existingUser) {
          await createUser({
            name: profile.name ?? "", //TODO: How to handle this?
            email: profile.email ?? "", //TODO: How to handle this?
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          email: token.email as string,
          name: token.name as string | undefined,
          image: token.picture as string | undefined,
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
