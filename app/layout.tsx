"use client";

import { GeistMono } from "geist/font/mono";
import { Roboto_Mono } from "next/font/google";
import { Toaster } from "sonner";
import ColorStyles from "@/components/shared/color-styles/color-styles";
import Scrollbar from "@/components/ui/scrollbar";
import { BigIntProvider } from "@/components/providers/BigIntProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "styles/main.css";
import type { ReactNode } from "react";

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "none";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

// Create a single Convex client instance.
// A placeholder URL is used when Convex isn't configured — hooks will
// return undefined (loading state) and the app falls back to memory storage.
const convexClient = new ConvexReactClient(
  CONVEX_URL || "https://placeholder.convex.cloud"
);

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
});

/**
 * AppProviders conditionally wraps children based on configured auth/storage
 */
function AppProviders({ children }: { children: ReactNode }) {
  // Clerk + Convex mode (original behavior)
  if (AUTH_PROVIDER === "clerk" && CONVEX_URL) {
    const { ClerkProvider, useAuth } = require("@clerk/nextjs");
    const { ConvexProviderWithClerk } = require("convex/react-clerk");

    return (
      <ClerkProvider>
        <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
          <AuthProvider>{children}</AuthProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    );
  }

  // All other modes: bare ConvexProvider so hooks don't crash
  return (
    <ConvexProvider client={convexClient}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <html lang="en">
        <head>
          <title>Open Agent Builder</title>
          <meta
            name="description"
            content="Build AI agents and workflows with visual programming"
          />
          <link rel="icon" href="/favicon.png" />
          <ColorStyles />
        </head>
        <body
          className={`${GeistMono.variable} ${robotoMono.variable} font-sans text-accent-black bg-background-base overflow-x-clip`}
        >
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
