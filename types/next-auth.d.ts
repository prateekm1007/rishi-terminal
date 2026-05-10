import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    tier: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tier: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    tier: string;
  }
}
