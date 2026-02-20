"use client";
import {
  useUser,
  SignInButton as ClerkSignInButton,
  UserButton as ClerkUserButton,
  SignedIn as ClerkSignedIn,
  SignedOut as ClerkSignedOut,
} from "@clerk/nextjs";
import type { AuthProvider, AuthUser } from "./types";

function useClerkCurrentUser(): AuthUser | null {
  const { user } = useUser();
  if (!user) return null;
  return {
    uid: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    displayName: user.fullName ?? null,
    photoURL: user.imageUrl ?? null,
  };
}

function useClerkIsLoading(): boolean {
  const { isLoaded } = useUser();
  return !isLoaded;
}

function ClerkSignInButtonWrapper({ children }: { children: React.ReactNode }) {
  return <ClerkSignInButton mode="modal">{children as any}</ClerkSignInButton>;
}

function ClerkUserButtonWrapper() {
  return <ClerkUserButton afterSignOutUrl="/" />;
}

function ClerkSignedInWrapper({ children }: { children: React.ReactNode }) {
  return <ClerkSignedIn>{children}</ClerkSignedIn>;
}

function ClerkSignedOutWrapper({ children }: { children: React.ReactNode }) {
  return <ClerkSignedOut>{children}</ClerkSignedOut>;
}

export const clerkAdapter: AuthProvider = {
  useCurrentUser: useClerkCurrentUser,
  useIsLoading: useClerkIsLoading,
  SignInButton: ClerkSignInButtonWrapper,
  UserButton: ClerkUserButtonWrapper,
  SignedIn: ClerkSignedInWrapper,
  SignedOut: ClerkSignedOutWrapper,
};
