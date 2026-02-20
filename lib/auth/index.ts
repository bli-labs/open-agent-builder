import type { AuthProvider } from "./types";

export function getAuthProvider(): AuthProvider {
  const p = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "none";

  if (p === "clerk") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { clerkAdapter } = require("./clerk-adapter") as typeof import("./clerk-adapter");
    return clerkAdapter;
  }

  if (p === "firebase") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { firebaseAdapter } = require("./firebase-adapter") as typeof import("./firebase-adapter");
    return firebaseAdapter;
  }

  // Default: no auth (works with zero config)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { noAuthProvider } = require("./no-auth") as typeof import("./no-auth");
  return noAuthProvider;
}

export type { AuthProvider, AuthUser } from "./types";
