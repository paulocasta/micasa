import { NextResponse, type NextRequest } from "next/server";
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const valid = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return valid ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!valid) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:png|svg|ico|webp)$).*)"],
};
