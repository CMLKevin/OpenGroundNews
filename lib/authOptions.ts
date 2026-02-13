import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { linkOAuthAccount, upsertOAuthUserByEmail } from "@/lib/dbAuth";

const providers = [] as NextAuthOptions["providers"];
const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
export const isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret);

providers.push(
  CredentialsProvider({
    name: "credentials-placeholder",
    credentials: {},
    async authorize() {
      return null;
    },
  }),
);

if (isGoogleOAuthConfigured) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false;
      const dbUser = await upsertOAuthUserByEmail(user.email);
      if (account?.provider && account.providerAccountId) {
        await linkOAuthAccount({
          userId: dbUser.id,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user.email,
          accessToken: typeof account.access_token === "string" ? account.access_token : null,
          refreshToken: typeof account.refresh_token === "string" ? account.refresh_token : null,
          expiresAtSeconds: typeof account.expires_at === "number" ? account.expires_at : null,
        });
      }
      return true;
    },
    async jwt({ token }) {
      if (token?.email) {
        const dbUser = await db.user.findUnique({ where: { email: String(token.email).toLowerCase() } }).catch(() => null);
        if (dbUser) {
          (token as any).userId = dbUser.id;
          (token as any).role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).userId || null;
        (session.user as any).role = (token as any).role || "user";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        const base = new URL(baseUrl);
        if (parsed.origin === base.origin) return parsed.toString();
      } catch {
        // Ignore invalid redirect URL and fall back.
      }
      return baseUrl;
    },
  },
};
