import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/db/supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, name, tier')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({ email: credentials.email, name: credentials.email.split('@')[0], tier: 'seeker' })
            .select('id, email, name, tier')
            .single();

          if (createError || !newUser) return null;
          return { id: newUser.id, email: newUser.email, name: newUser.name, tier: newUser.tier };
        }

        return { id: user.id, email: user.email, name: user.name, tier: user.tier };
      },
    }),
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id, tier')
          .eq('email', user.email!)
          .single();

        if (!existing) {
          const { data: newUser } = await supabaseAdmin
            .from('users')
            .insert({ email: user.email, name: user.name, tier: 'seeker' })
            .select('id, tier')
            .single();
          if (newUser) { user.id = newUser.id; user.tier = newUser.tier; }
        } else {
          user.id   = existing.id;
          user.tier = existing.tier;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.tier = user.tier; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id   as string;
        session.user.tier = token.tier as string;
      }
      return session;
    },
  },
  pages:   { signIn: '/auth/signin' },
  session: { strategy: 'jwt' },
  secret:  process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
