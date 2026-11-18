"use client";

import { HomeIcon } from "lucide-react";
import { useActionState } from "react";
import { Field, SubmitButton } from "@/components/app/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/server/auth-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <span className="mx-auto mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <HomeIcon className="size-6" aria-hidden />
        </span>
        <CardTitle className="text-xl">Mi Casa</CardTitle>
        <CardDescription>Ingresá la contraseña para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              aria-invalid={state?.error ? true : undefined}
              aria-describedby={state?.error ? "login-error" : undefined}
            />
          </Field>
          {state?.error && (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <SubmitButton size="lg">Ingresar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
