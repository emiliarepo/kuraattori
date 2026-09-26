import NextAuth from "next-auth";
import { cache } from "react";

import { buildAuthConfig } from "./config";

const {
  auth: uncachedAuth,
  handlers,
  signIn,
  signOut,
} = NextAuth(buildAuthConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
