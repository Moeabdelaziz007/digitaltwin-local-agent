// ============================================================
// Clerk Middleware — Route Protection (Next.js 16 uses proxy.ts)
// Public-by-default, opt-in protection for authenticated routes
// ============================================================

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Protected routes — require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboard(.*)',
  '/settings(.*)',
  '/memory(.*)',
  '/memory-canvas(.*)',
  '/api/conversation(.*)',
]);

// Public routes that should NEVER be protected
// (Cron jobs use Bearer token auth, not user sessions)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/cron(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
