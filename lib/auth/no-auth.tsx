"use client";
import type { AuthProvider, AuthUser } from "./types";

const ANON: AuthUser = { uid: "anonymous" };

export const noAuthProvider: AuthProvider = {
  useCurrentUser: () => ANON,
  useIsLoading: () => false,
  SignInButton: ({ children }) => <>{children}</>,
  UserButton: () => null,
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: () => null,
};
