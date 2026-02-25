import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    pages: {
      signIn: "/login",
      error: "/login",
    },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.image = user.image || (profile as any)?.picture || "";
        token.googleId = account?.providerAccountId || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.image = (token.image as string) || "";
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
