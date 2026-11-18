import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "micasa_session";
const SESSION_DAYS = 30;

export function isAuthEnabled() {
  return Boolean(process.env.APP_PASSWORD);
}

function secretKey() {
  const secret = process.env.SESSION_SECRET || process.env.APP_PASSWORD || "";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken() {
  return new SignJWT({ sub: "micasa" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
