"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, isAuthEnabled, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

function samePassword(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  if (!isAuthEnabled()) redirect("/");
  const password = String(formData.get("password") ?? "");
  if (!samePassword(password, process.env.APP_PASSWORD!)) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: "Contraseña incorrecta" };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
