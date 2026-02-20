"use client";
import { useEffect, useState } from "react";
import type { AuthProvider, AuthUser } from "./types";

// NOTE: This adapter requires firebase to be installed and configured.
// Install with: npm install firebase
// Configure by creating lib/firebase/config.ts with firebaseAuth export

// Use conditional type to avoid errors when firebase is not installed
type User = any; // Will be properly typed when firebase is installed

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

function useFirebaseUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamic import to avoid loading firebase when not configured
    // Type assertions needed because firebase may not be installed
    import("@/lib/firebase/config" as any).then(({ firebaseAuth }: any) => {
      const unsubscribe = firebaseAuth.onAuthStateChanged((u: User | null) => {
        setUser(u ? toAuthUser(u) : null);
        setLoading(false);
      });
      return () => unsubscribe();
    }).catch(() => {
      // Firebase not configured
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

function FirebaseSignInButton({ children }: { children: React.ReactNode }) {
  const handleSignIn = async () => {
    // Type assertions needed because firebase may not be installed
    const { firebaseAuth } = await import("@/lib/firebase/config" as any) as any;
    const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth" as any) as any;
    await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  };
  return (
    <span onClick={handleSignIn} style={{ cursor: "pointer" }}>
      {children}
    </span>
  );
}

function FirebaseUserButton() {
  const { user } = useFirebaseUser();
  if (!user) return null;

  const handleSignOut = async () => {
    // Type assertions needed because firebase may not be installed
    const { firebaseAuth } = await import("@/lib/firebase/config" as any) as any;
    const { signOut } = await import("firebase/auth" as any) as any;
    await signOut(firebaseAuth);
  };

  return (
    <button
      onClick={handleSignOut}
      title="Sign out"
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt={user.displayName ?? "User"}
          style={{ width: 32, height: 32, borderRadius: "50%" }}
        />
      ) : (
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#e84242",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {user.displayName?.charAt(0) ?? "U"}
        </span>
      )}
    </button>
  );
}

function FirebaseSignedIn({ children }: { children: React.ReactNode }) {
  const { user } = useFirebaseUser();
  return user ? <>{children}</> : null;
}

function FirebaseSignedOut({ children }: { children: React.ReactNode }) {
  const { user, loading } = useFirebaseUser();
  return !loading && !user ? <>{children}</> : null;
}

export const firebaseAdapter: AuthProvider = {
  useCurrentUser: () => useFirebaseUser().user,
  useIsLoading: () => useFirebaseUser().loading,
  SignInButton: FirebaseSignInButton,
  UserButton: FirebaseUserButton,
  SignedIn: FirebaseSignedIn,
  SignedOut: FirebaseSignedOut,
};
