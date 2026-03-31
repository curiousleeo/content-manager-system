import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      // Only allow your specific Gmail account
      if (!ALLOWED_EMAIL) return true; // if not set, allow any Google account
      return profile?.email === ALLOWED_EMAIL;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
