import type { DefaultSession } from "next-auth";

// Augment the session/user with our custom fields.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      kind?: string;
    } & DefaultSession["user"];
  }

  interface User {
    kind?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    kind?: string;
  }
}
