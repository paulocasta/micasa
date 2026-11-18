"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/action-result";

/** Muestra un toast con el resultado de una acción y ejecuta onSuccess. */
export function useActionFeedback(state: ActionResult | null, onSuccess?: () => void) {
  const cb = useRef(onSuccess);
  useEffect(() => {
    cb.current = onSuccess;
  });
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      cb.current?.();
    } else {
      toast.error(state.error);
    }
  }, [state]);
}

export async function runAction(promise: Promise<ActionResult>) {
  const res = await promise;
  if (res.ok) {
    if (res.message) toast.success(res.message);
  } else {
    toast.error(res.error);
  }
  return res;
}

export function SubmitButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending && <Loader2Icon className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function FormError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {state.error}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MoneyInput(props: React.ComponentProps<typeof InputGroupInput>) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput inputMode="decimal" autoComplete="off" placeholder="0" className="tabular" {...props} />
    </InputGroup>
  );
}

/** Select nativo con estilo (funciona en formularios sin JS y es cómodo en móvil). */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground",
        className,
      )}
      {...props}
    />
  );
}
