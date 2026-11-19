"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/server/action-result";
import { runAction } from "./ui";

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Eliminar",
  variant = "destructive",
  action,
  redirectTo,
  altAction,
  altLabel,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  action: () => Promise<ActionResult>;
  redirectTo?: string;
  /** Segunda acción opcional (ej. "Todas las cuotas"). */
  altAction?: () => Promise<ActionResult>;
  altLabel?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {altAction && (
            <AlertDialogAction
              variant={variant}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await runAction(altAction());
                  if (res.ok && redirectTo) router.push(redirectTo);
                })
              }
            >
              {altLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            variant={variant}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await runAction(action());
                if (res.ok && redirectTo) router.push(redirectTo);
              })
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
