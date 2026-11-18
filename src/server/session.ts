import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Verifica la sesión dentro de cada Server Action (el proxy no alcanza). */
export async function requireAuth() {
  if (!isAuthEnabled()) return;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/login");
}
