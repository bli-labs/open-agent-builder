import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? 'none';

export default async function middleware(request: NextRequest) {
  // Only use Clerk middleware when auth provider is set to clerk
  if (AUTH_PROVIDER === 'clerk') {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');

    const isPublicRoute = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/public(.*)',
      '/api/config(.*)',
      '/api/templates(.*)',
      '/api/mcp(.*)',
      '/api/test-mcp-connection(.*)',
    ]);

    const isApiKeyRoute = createRouteMatcher([
      '/api/workflows/:workflowId/execute',
      '/api/workflows/:workflowId/execute-stream',
      '/api/workflows/:workflowId/resume',
    ]);

    const handler = clerkMiddleware(async (auth, req) => {
      if (isApiKeyRoute(req)) return;
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    });

    return handler(request, {} as any);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
