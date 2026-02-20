import type { StorageProvider } from "./types";

export function getStorageProvider(): StorageProvider {
  const p = process.env.NEXT_PUBLIC_STORAGE_PROVIDER ?? "memory";

  if (p === "convex") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { convexAdapter } = require("./convex-adapter") as typeof import("./convex-adapter");
    return convexAdapter;
  }

  if (p === "firebase") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { firebaseStorageAdapter } = require("./firebase-adapter") as typeof import("./firebase-adapter");
    return firebaseStorageAdapter;
  }

  // Default: in-memory storage (ephemeral, works with zero config)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { memoryAdapter } = require("./memory") as typeof import("./memory");
  return memoryAdapter;
}

export type { StorageProvider } from "./types";
