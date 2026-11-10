import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const signInPath = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const signUpPath = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
const publicAuthPaths = [signInPath, signUpPath];

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const { isAuthenticated } = await auth();
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/editor" : signInPath, request.url),
    );
  }

  const isPublicAuthPath = publicAuthPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isPublicAuthPath) {
    await auth.protect();
  }
});

export const config = {
  matcher: "/((?!_next/|favicon\\.ico$).*)",
};
