import { NextRequest, NextResponse } from "next/server";

const SESSION_KEY = "portfolio_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_KEY);

  // No session → force back to login
  if (pathname.startsWith("/main") && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Has session → skip login page
  if (pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/main", request.url));
  }
}

export const config = {
  matcher: ["/", "/main/:path*"],
};
