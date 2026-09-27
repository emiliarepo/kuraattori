import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import "next-auth/jwt";

import { env } from "~/env";
import { getDb } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}

/**
 * Built per request: the D1 binding the adapter needs isn't available at
 * module load time, only once a request reaches the Worker.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const isDev = env.NODE_ENV === "development";

export async function buildAuthConfig(): Promise<NextAuthConfig> {
  const db = await getDb();

  return {
    trustHost: true,
    providers: [
      GoogleProvider,
      /**
       * Dev-only: lets the full sign-in flow be verified without real Google
       * credentials. Never registered outside NODE_ENV=development.
       */
      ...(isDev
        ? [
            CredentialsProvider({
              id: "dev",
              name: "Kehityskäyttäjä",
              credentials: {
                email: { label: "Sähköposti", type: "email" },
                name: { label: "Nimi", type: "text" },
              },
              async authorize(credentials) {
                const email =
                  (typeof credentials?.email === "string" &&
                    credentials.email.trim()) ||
                  "dev@kuraattori.local";
                const name =
                  (typeof credentials?.name === "string" &&
                    credentials.name.trim()) ||
                  null;

                const [existing] = await db
                  .select()
                  .from(users)
                  .where(eq(users.email, email))
                  .limit(1);
                if (existing)
                  return {
                    id: existing.id,
                    email: existing.email,
                    name: existing.name,
                  };

                const id = crypto.randomUUID();
                await db.insert(users).values({ id, email, name });
                return { id, email, name };
              },
            }),
          ]
        : []),
    ],
    adapter: DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    }),
    // The Credentials provider only works with JWT sessions; Google keeps the
    // adapter's database sessions in every environment where it's the only
    // provider.
    session: isDev ? { strategy: "jwt" } : undefined,
    callbacks: {
      jwt: ({ token, user }) => {
        if (user?.id) token.id = user.id;
        return token;
      },
      session: ({ session, user, token }) => ({
        ...session,
        user: {
          ...session.user,
          id: user?.id ?? token?.id ?? "",
        },
      }),
    },
  };
}
