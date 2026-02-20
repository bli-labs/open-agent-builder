"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AuthProvider as AuthProviderType, AuthUser } from "@/lib/auth/types";
import { getAuthProvider } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  SignInButton: AuthProviderType["SignInButton"];
  UserButton: AuthProviderType["UserButton"];
  SignedIn: AuthProviderType["SignedIn"];
  SignedOut: AuthProviderType["SignedOut"];
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Hook to access the current auth context
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }
  return ctx;
}

/**
 * AuthProvider wraps the entire app and provides auth state/components
 *
 * The provider is determined by NEXT_PUBLIC_AUTH_PROVIDER env var:
 * - "none" (default) - Always signed in as anonymous, zero config
 * - "clerk" - Uses Clerk for authentication
 * - "firebase" - Uses Firebase Auth with Google Sign-In
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Get the auth provider based on env var (memoized to avoid re-creating on every render)
  const provider = useMemo(() => getAuthProvider(), []);

  // Call the provider's hooks unconditionally (React rules of hooks)
  // These hooks are from the selected adapter (no-auth, clerk, or firebase)
  const user = provider.useCurrentUser();
  const isLoading = provider.useIsLoading();

  const value: AuthContextValue = {
    user,
    isLoading,
    SignInButton: provider.SignInButton,
    UserButton: provider.UserButton,
    SignedIn: provider.SignedIn,
    SignedOut: provider.SignedOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
