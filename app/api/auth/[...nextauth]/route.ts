import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase, isSupabaseConfigured } from "@/lib/db/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // If Supabase isn't configured, allow a demo session (so UI doesn't break)
        if (!isSupabaseConfigured) {
          return {
            id: "demo-user",
            email: credentials.email,
            name: credentials.email.split("@")[0],
          };
        }

        // If Supabase is configured, persist/find user
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error || !data) {
          const { data: newUser } = await supabase
            .from("users")
            .insert({ email: credentials.email })
            .select()
            .single();

          return newUser ? { id: newUser.id, email: newUser.email, name: newUser.name } : null;
        }

        return { id: data.id, email: data.email, name: data.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (!isSupabaseConfigured) return true;

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!existingUser) {
        await supabase.from("users").insert({ email: user.email, name: user.name });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub || "demo-user";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };