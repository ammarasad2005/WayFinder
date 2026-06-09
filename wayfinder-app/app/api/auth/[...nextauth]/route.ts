// app/api/auth/[...nextauth]/route.ts
// next-auth Google Sign-In configuration.
// Session is stored in secure HttpOnly cookies — never in localStorage.

import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// Validate required environment variables at startup
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  // In dev, warn instead of crash — Sign-In will be disabled gracefully in UI
  console.warn('[auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Sign-In disabled');
}

if (!nextAuthSecret) {
  console.warn('[auth] NEXTAUTH_SECRET environment variable is not set.');
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: googleClientId ?? '',
      clientSecret: googleClientSecret ?? '',
    }),
  ],
  secret: nextAuthSecret,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      // Store provider account ID for KV key scoping
      if (account) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as typeof session.user & { id: string }).id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',  // Redirect to home if unauthenticated route is hit
  },
});

export { handler as GET, handler as POST };
