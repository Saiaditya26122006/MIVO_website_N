import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Skip middleware if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Without Supabase, all routes except /auth are accessible
    // Redirect /account and /admin to login
    if (request.nextUrl.pathname.startsWith("/account") || request.nextUrl.pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect /account routes
  if (request.nextUrl.pathname.startsWith("/account")) {
    if (!session) {
      const redirectUrl = new URL("/auth/login", request.url);

      // Only preserve safe internal paths
      const returnPath = request.nextUrl.pathname;
      if (returnPath.startsWith("/account") && !returnPath.includes("..")) {
        redirectUrl.searchParams.set("redirect", returnPath);
      }

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages (except verify-email)
  if (
    request.nextUrl.pathname.startsWith("/auth/") &&
    session &&
    !request.nextUrl.pathname.includes("verify-email")
  ) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/auth/:path*", "/admin/:path*"],
};
