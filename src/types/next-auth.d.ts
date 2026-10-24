import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "CLIENT";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      clientId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    clientId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    clientId: string | null;
  }
}
