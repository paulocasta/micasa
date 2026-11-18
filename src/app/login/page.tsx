import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isAuthEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection(); // la contraseña se lee en runtime, no en build
  if (!isAuthEnabled()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <LoginForm next={typeof next === "string" ? next : "/"} />
    </main>
  );
}
