import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes here
const isPublicRoute = createRouteMatcher([
  "/sign-in",
  "/sign-up",
  "/api/webhook/clerk", // Allow webhook route
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const session = await auth();

    // Optional: log session info for debugging
    console.log("Session in middleware:", session);

    await auth.protect(); // throws if no valid session
  }
});

export const config = {
  matcher: [
    // Avoid matching Next.js internals or static files
    "/((?!_next|.*\\..*).*)",
    // Always match API and TRPC routes
    "/(api|trpc)(.*)",
  ],
};
