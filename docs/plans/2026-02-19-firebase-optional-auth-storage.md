# Firebase Auth + Persistent Storage (Optional) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional Firebase auth and Firestore persistent storage as an alternative to Clerk+Convex, with the default being no-auth/no-persistence mode.

**Architecture:** Introduce an `AUTH_PROVIDER` environment variable (`"none"` | `"clerk"` | `"firebase"`) and a `STORAGE_PROVIDER` variable (`"memory"` | `"convex"` | `"firebase"`). A thin provider abstraction wraps all auth and storage calls so the rest of the app stays unchanged. Default is `none`/`memory` so it works with zero config.

**Tech Stack:** Firebase 10 (firebase/app, firebase/auth, firebase/firestore), existing Next.js 16/React 19, Jotai atoms for client state, existing Convex/Clerk (kept working).

---

### Task 1: Create Auth Provider Abstraction

**Files:**
- Create: `lib/auth/types.ts`
- Create: `lib/auth/index.ts`
- Create: `lib/auth/no-auth.ts`
- Create: `lib/auth/clerk-adapter.tsx`
- Create: `lib/auth/firebase-adapter.tsx`

**Step 1: Define the AuthUser type and AuthProvider interface in `lib/auth/types.ts`**

```ts
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
  /** Sign in with redirect/modal */
  SignInButton: React.ComponentType<{ children: React.ReactNode }>;
  /** User avatar / account button */
  UserButton: React.ComponentType<Record<string, unknown>>;
  /** Render children only when signed in */
  SignedIn: React.ComponentType<{ children: React.ReactNode }>;
  /** Render children only when signed out */
  SignedOut: React.ComponentType<{ children: React.ReactNode }>;
}
```

**Step 2: Write the no-auth adapter in `lib/auth/no-auth.tsx`**

Always reports a signed-in anonymous user — no barriers, works with zero config.

```tsx
"use client";
import { AuthProvider, AuthUser } from "./types";

const ANON: AuthUser = { uid: "anonymous" };

export const noAuthProvider: AuthProvider = {
  useCurrentUser: () => ANON,
  useIsLoading: () => false,
  SignInButton: ({ children }) => <>{children}</>,
  UserButton: () => null,
  SignedIn: ({ children }) => <>{children}</>,
  SignedOut: () => null,
};
```

**Step 3: Write the Clerk adapter in `lib/auth/clerk-adapter.tsx`**

Thin wrapper over `@clerk/nextjs`. Maps Clerk's user shape to `AuthUser`.

```tsx
"use client";
import { useUser, SignInButton as ClerkSignInButton, UserButton as ClerkUserButton, SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut } from "@clerk/nextjs";
import { AuthProvider, AuthUser } from "./types";

export const clerkAdapter: AuthProvider = {
  useCurrentUser: () => {
    const { user } = useUser();
    if (!user) return null;
    return { uid: user.id, email: user.primaryEmailAddress?.emailAddress, displayName: user.fullName, photoURL: user.imageUrl };
  },
  useIsLoading: () => {
    const { isLoaded } = useUser();
    return !isLoaded;
  },
  SignInButton: ({ children }) => <ClerkSignInButton mode="modal">{children as any}</ClerkSignInButton>,
  UserButton: () => <ClerkUserButton afterSignOutUrl="/" />,
  SignedIn: ({ children }) => <ClerkSignedIn>{children}</ClerkSignedIn>,
  SignedOut: ({ children }) => <ClerkSignedOut>{children}</ClerkSignedOut>,
};
```

**Step 4: Write the Firebase adapter in `lib/auth/firebase-adapter.tsx`**

Uses `onAuthStateChanged` for reactive state and Google popup for sign-in.

```tsx
"use client";
import { useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/config";
import { AuthProvider, AuthUser } from "./types";
import type { User } from "firebase/auth";

function toAuthUser(u: User): AuthUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL };
}

function useFirebaseUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return firebaseAuth.onAuthStateChanged((u) => {
      setUser(u ? toAuthUser(u) : null);
      setLoading(false);
    });
  }, []);
  return { user, loading };
}

export const firebaseAdapter: AuthProvider = {
  useCurrentUser: () => useFirebaseUser().user,
  useIsLoading: () => useFirebaseUser().loading,
  SignInButton: ({ children }) => {
    const handleSignIn = () => signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    return <span onClick={handleSignIn} style={{ cursor: "pointer" }}>{children}</span>;
  },
  UserButton: () => {
    const { user } = useFirebaseUser();
    if (!user) return null;
    return (
      <button onClick={() => signOut(firebaseAuth)} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer" }}>
        {user.photoURL ? <img src={user.photoURL} alt={user.displayName ?? "User"} style={{ width: 32, height: 32, borderRadius: "50%" }} /> : <span>{user.displayName?.charAt(0) ?? "U"}</span>}
      </button>
    );
  },
  SignedIn: ({ children }) => {
    const { user } = useFirebaseUser();
    return user ? <>{children}</> : null;
  },
  SignedOut: ({ children }) => {
    const { user, loading } = useFirebaseUser();
    return !loading && !user ? <>{children}</> : null;
  },
};
```

**Step 5: Create the factory in `lib/auth/index.ts`**

```ts
import type { AuthProvider } from "./types";

export function getAuthProvider(): AuthProvider {
  // Dynamic imports keep unused adapters out of bundles
  const p = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "none";
  if (p === "clerk") {
    const { clerkAdapter } = require("./clerk-adapter");
    return clerkAdapter;
  }
  if (p === "firebase") {
    const { firebaseAdapter } = require("./firebase-adapter");
    return firebaseAdapter;
  }
  const { noAuthProvider } = require("./no-auth");
  return noAuthProvider;
}
```

**Step 6: Commit**

```bash
git add lib/auth/
git commit -m "feat: add auth provider abstraction (no-auth, clerk, firebase)"
```

---

### Task 2: Create Storage Provider Abstraction

**Files:**
- Create: `lib/storage/types.ts`
- Create: `lib/storage/memory.ts`
- Create: `lib/storage/convex-adapter.ts`
- Create: `lib/storage/firebase-adapter.ts`
- Create: `lib/storage/index.ts`

**Step 1: Define StorageProvider interface in `lib/storage/types.ts`**

```ts
import { Workflow } from "@/lib/workflow/types";

export interface StorageProvider {
  /** List all workflows for a user. Pass undefined for anonymous. */
  listWorkflows(userId?: string): Promise<Workflow[]>;
  /** Fetch a single workflow by its custom or Convex ID. */
  getWorkflow(id: string): Promise<Workflow | null>;
  /** Save (upsert) a workflow. Returns the saved workflow ID. */
  saveWorkflow(workflow: Workflow, userId?: string): Promise<string>;
  /** Permanently delete a workflow. */
  deleteWorkflow(id: string): Promise<void>;
}
```

**Step 2: Write in-memory adapter in `lib/storage/memory.ts`**

Stores in a module-level `Map`. Data resets on page reload. Good for zero-config demos.

```ts
import { Workflow } from "@/lib/workflow/types";
import { StorageProvider } from "./types";

const store = new Map<string, Workflow>();

export const memoryAdapter: StorageProvider = {
  async listWorkflows(userId) {
    return [...store.values()].filter(w => !userId || w.userId === userId || w.userId === undefined);
  },
  async getWorkflow(id) {
    return store.get(id) ?? null;
  },
  async saveWorkflow(workflow, userId) {
    const id = workflow.id ?? `workflow_${Date.now()}`;
    store.set(id, { ...workflow, id, userId: userId ?? workflow.userId, updatedAt: new Date().toISOString() });
    return id;
  },
  async deleteWorkflow(id) {
    store.delete(id);
  },
};
```

**Step 3: Write Convex adapter in `lib/storage/convex-adapter.ts`**

Delegates to existing `/api/workflows` REST routes.

```ts
import { Workflow } from "@/lib/workflow/types";
import { StorageProvider } from "./types";

export const convexAdapter: StorageProvider = {
  async listWorkflows() {
    const res = await fetch("/api/workflows");
    const data = await res.json();
    return data.workflows ?? [];
  },
  async getWorkflow(id) {
    const res = await fetch(`/api/workflows/${id}`);
    const data = await res.json();
    return data.workflow ?? null;
  },
  async saveWorkflow(workflow) {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
    const data = await res.json();
    return data.workflowId ?? workflow.id;
  },
  async deleteWorkflow(id) {
    await fetch(`/api/workflows?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
```

**Step 4: Write Firebase/Firestore adapter in `lib/storage/firebase-adapter.ts`**

```ts
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase/config";
import { Workflow } from "@/lib/workflow/types";
import { StorageProvider } from "./types";

const COLL = "workflows";

export const firebaseStorageAdapter: StorageProvider = {
  async listWorkflows(userId) {
    const col = collection(firestore, COLL);
    const q = userId ? query(col, where("userId", "==", userId)) : col;
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Workflow);
  },
  async getWorkflow(id) {
    const snap = await getDoc(doc(firestore, COLL, id));
    return snap.exists() ? (snap.data() as Workflow) : null;
  },
  async saveWorkflow(workflow, userId) {
    const id = workflow.id ?? `workflow_${Date.now()}`;
    const data = { ...workflow, id, userId: userId ?? workflow.userId ?? null, updatedAt: new Date().toISOString() };
    await setDoc(doc(firestore, COLL, id), data);
    return id;
  },
  async deleteWorkflow(id) {
    await deleteDoc(doc(firestore, COLL, id));
  },
};
```

**Step 5: Create factory in `lib/storage/index.ts`**

```ts
import type { StorageProvider } from "./types";

export function getStorageProvider(): StorageProvider {
  const p = process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "memory";
  if (p === "convex") {
    const { convexAdapter } = require("./convex-adapter");
    return convexAdapter;
  }
  if (p === "firebase") {
    const { firebaseStorageAdapter } = require("./firebase-adapter");
    return firebaseStorageAdapter;
  }
  const { memoryAdapter } = require("./memory");
  return memoryAdapter;
}
```

**Step 6: Commit**

```bash
git add lib/storage/
git commit -m "feat: add storage provider abstraction (memory, convex, firebase)"
```

---

### Task 3: Install Firebase SDK and Create Config Module

**Files:**
- Create: `lib/firebase/config.ts`

**Step 1: Install firebase**

```bash
npm install firebase
```

**Step 2: Create `lib/firebase/config.ts`**

```ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Avoid re-initializing on hot reload
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);
```

Note: `lib/firebase/config.ts` is only imported when `NEXT_PUBLIC_AUTH_PROVIDER=firebase` or `NEXT_PUBLIC_STORAGE_PROVIDER=firebase`, so missing env vars won't break other modes.

**Step 3: Commit**

```bash
git add lib/firebase/ package.json package-lock.json
git commit -m "feat: add firebase config module and install firebase SDK"
```

---

### Task 4: Create AuthContext React Provider

**Files:**
- Create: `components/providers/AuthProvider.tsx`

**Step 1: Write `AuthProvider.tsx`**

Reads `NEXT_PUBLIC_AUTH_PROVIDER` and provides a React context with `useAuthContext()`, `SignedIn`, `SignedOut`, `SignInButton`, `UserButton` — so pages/components never import from `@clerk/nextjs` directly.

```tsx
"use client";
import { createContext, useContext, useMemo } from "react";
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

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const provider = useMemo(() => getAuthProvider(), []);

  // Hooks must be called here unconditionally
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
```

**Step 2: Commit**

```bash
git add components/providers/AuthProvider.tsx
git commit -m "feat: add AuthContext provider wrapping auth abstraction"
```

---

### Task 5: Update Root Layout to Use Auth Abstraction

**Files:**
- Modify: `app/layout.tsx`

**Current state:** Always wraps everything in `<ClerkProvider>` + `<ConvexProviderWithClerk>`.

**Step 1: Read `app/layout.tsx` (already done during planning)**

**Step 2: Make providers conditional on env var**

```tsx
"use client";
import { GeistMono } from "geist/font/mono";
import { Roboto_Mono } from "next/font/google";
import { Toaster } from "sonner";
import ColorStyles from "@/components/shared/color-styles/color-styles";
import Scrollbar from "@/components/ui/scrollbar";
import { BigIntProvider } from "@/components/providers/BigIntProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "styles/main.css";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "none";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-roboto-mono" });

function AppProviders({ children }: { children: React.ReactNode }) {
  if (AUTH_PROVIDER === "clerk" && CONVEX_URL) {
    // Lazy import to avoid loading Clerk in non-clerk mode
    const { ClerkProvider, useAuth } = require("@clerk/nextjs");
    const { ConvexProviderWithClerk } = require("convex/react-clerk");
    const { ConvexReactClient } = require("convex/react");
    const convex = new ConvexReactClient(CONVEX_URL);
    return (
      <ClerkProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <AuthProvider>{children}</AuthProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }
  // firebase or none — AuthProvider handles everything
  return <AuthProvider>{children}</AuthProvider>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <html lang="en">
        <head>
          <title>Open Agent Builder</title>
          <meta name="description" content="Build AI agents and workflows with visual programming" />
          <link rel="icon" href="/favicon.png" />
          <ColorStyles />
        </head>
        <body className={`${GeistMono.variable} ${robotoMono.variable} font-sans text-accent-black bg-background-base overflow-x-clip`}>
          <BigIntProvider>
            <main className="overflow-x-clip">{children}</main>
            <Scrollbar />
            <Toaster position="bottom-right" />
          </BigIntProvider>
        </body>
      </html>
    </AppProviders>
  );
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: make layout auth-provider-aware, default to no-auth"
```

---

### Task 6: Update `app/page.tsx` to Use AuthContext

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace Clerk imports with AuthContext hook**

All usages of `SignedIn`, `SignedOut`, `SignInButton`, `UserButton` from `@clerk/nextjs` should come from `useAuthContext()` instead.

```tsx
// Remove:
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

// Add:
import { useAuthContext } from "@/components/providers/AuthProvider";

// In component:
const { SignedIn, SignedOut, SignInButton, UserButton } = useAuthContext();
```

**Step 2: Ensure WorkflowBuilder is accessible without auth**

The `<SignedIn>` wrapper around `<WorkflowBuilder>` now uses the no-auth adapter which always renders — so the builder works without login.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: home page uses AuthContext instead of Clerk directly"
```

---

### Task 7: Update `hooks/useWorkflow.ts` to Use Storage Abstraction

**Files:**
- Modify: `hooks/useWorkflow.ts`

**Step 1: Replace fetch calls with storage provider**

```ts
import { getStorageProvider } from "@/lib/storage";

const storageProvider = getStorageProvider();

// Replace: fetch('/api/workflows')
// With: storageProvider.listWorkflows(userId)

// Replace: fetch('/api/workflows', { method: 'POST', ... })
// With: storageProvider.saveWorkflow(workflow, userId)

// Replace: fetch('/api/workflows/${workflowId}')
// With: storageProvider.getWorkflow(workflowId)
```

**Step 2: Get userId from AuthContext**

```ts
import { useAuthContext } from "@/components/providers/AuthProvider";
// In hook:
const { user } = useAuthContext();
const userId = user?.uid;
```

Pass `userId` to all `storageProvider` calls.

**Step 3: Commit**

```bash
git add hooks/useWorkflow.ts
git commit -m "feat: useWorkflow uses storage provider abstraction"
```

---

### Task 8: Update API Routes to Be Optional (Graceful Degradation)

**Files:**
- Modify: `app/api/workflows/route.ts`

**Step 1: Return empty success response when Convex is not configured**

The route already checks `isConvexConfigured()`. Ensure it returns `{ workflows: [], total: 0 }` with a 200 (not 500) when storage is memory/firebase so client-side storage hooks don't see errors.

```ts
if (!isConvexConfigured()) {
  return NextResponse.json({
    workflows: [],
    total: 0,
    source: 'none',
    message: 'Convex not configured. Using client-side storage.',
  });
}
```

The POST and DELETE should also return `{ success: true, message: "Using client-side storage" }` gracefully.

**Step 2: Commit**

```bash
git add app/api/workflows/route.ts
git commit -m "feat: API workflow routes gracefully handle non-convex storage modes"
```

---

### Task 9: Create `.env.example`

**Files:**
- Create: `.env.example`

```bash
# ============================================================
# Auth provider: "none" (default) | "clerk" | "firebase"
# ============================================================
NEXT_PUBLIC_AUTH_PROVIDER=none

# Storage provider: "memory" (default, ephemeral) | "convex" | "firebase"
NEXT_PUBLIC_STORAGE_PROVIDER=memory

# --- Firebase (required only when using firebase auth/storage) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Clerk (required only when AUTH_PROVIDER=clerk) ---
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# --- Convex (required only when STORAGE_PROVIDER=convex) ---
NEXT_PUBLIC_CONVEX_URL=

# ============================================================
# LLM Provider Keys
# ============================================================
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# --- Firecrawl ---
FIRECRAWL_API_KEY=
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example documenting all provider options"
```

---

### Task 10: Update README with Setup Instructions

**Files:**
- Modify: `README.md`

Add a "Configuration" section documenting the three modes:

1. **Zero config (default)** — No env vars needed. App runs fully in-browser with ephemeral storage. Great for demos and local testing.

2. **Firebase mode** — Set `NEXT_PUBLIC_AUTH_PROVIDER=firebase`, `NEXT_PUBLIC_STORAGE_PROVIDER=firebase`, and add all `NEXT_PUBLIC_FIREBASE_*` vars. Users sign in with Google; workflows stored in Firestore.

3. **Clerk + Convex mode (original)** — Set `NEXT_PUBLIC_AUTH_PROVIDER=clerk`, `NEXT_PUBLIC_STORAGE_PROVIDER=convex`, and add all Clerk/Convex vars. Full production-grade persistence.

**Commit:**

```bash
git add README.md
git commit -m "docs: document zero-config, firebase, and clerk+convex setup modes"
```
