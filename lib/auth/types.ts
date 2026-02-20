import type { ReactNode, ComponentType } from "react";

export interface AuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface AuthProvider {
  /** Current user or null if not signed in */
  useCurrentUser(): AuthUser | null;
  /** Whether auth state is loading */
  useIsLoading(): boolean;
  /** Sign in button wrapper */
  SignInButton: ComponentType<{ children: ReactNode }>;
  /** User avatar / account button */
  UserButton: ComponentType<Record<string, unknown>>;
  /** Render children only when signed in */
  SignedIn: ComponentType<{ children: ReactNode }>;
  /** Render children only when signed out */
  SignedOut: ComponentType<{ children: ReactNode }>;
}
