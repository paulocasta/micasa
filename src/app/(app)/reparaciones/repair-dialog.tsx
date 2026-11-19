"use client";

import { CheckCircle2Icon, PencilIcon, PlusIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { InstallmentFields } from "@/components/app/installment-fields";
import { Field, FormError, MoneyInput, SubmitButton, useActionFeedback } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayInput } from "@/lib/dates";
import { centsToInput, parseMoney } from "@/lib/money";
import { saveRepair } from "@/server/repair-actions";

export type RepairView = {
  id: number;
  title: string;
  description: string;
  status: "PENDING" | "DONE";
  date: string;
  cost: number | null;
  estimatedCost: number | null;
  /** Si se pagó en cuotas: cantidad, valor de cada una y primer mes ("YYYY-MM"). */
  installmentCount: number | null;
  installmentAmount: number | null;
  firstInstallment: string;
};

export function RepairDialog({ repair, markDone }: { repair?: RepairView; markDone?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = !repair ? (
    <Button>
      <PlusIcon aria-hidden /> Nueva reparación
    </Button>
  ) : markDone ? (
    <Button size="sm" variant="secondary">
      <CheckCircle2Icon aria-hidden /> Marcar hecha
    </Button>
  ) : (
    <Button variant="ghost" size="icon" aria-label={`Editar ${repair.title}`}>
      <PencilIcon aria-hidden />
    </Button>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{!repair ? "Nueva reparación" : markDone ? `Terminar: ${repair.title}` : "Editar reparación"}</DialogTitle>
          <DialogDescription>
            Las reparaciones hechas suman al gasto del mes de su fecha.
          </DialogDescription>
        </DialogHeader>
        {open && <RepairForm repair={repair} markDone={markDone} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function RepairForm({ repair, markDone, onDone }: { repair?: RepairView; markDone?: boolean; onDone: () => void }) {
  const [state, action] = useActionState(saveRepair, null);
  useActionFeedback(state, onDone);
  const id = useId();
  const [status, setStatus] = useState<RepairView["status"]>(markDone ? "DONE" : (repair?.status ?? "DONE"));
  const [inInstallments, setInInstallments] = useState(!!repair?.installmentCount);
  const [count, setCount] = useState(repair?.installmentCount ?? 6);
  const [costText, setCostText] = useState(
    centsToInput(repair?.installmentAmount ?? repair?.cost ?? repair?.estimatedCost),
  );

  return (
    <form action={action} className="grid gap-4">
      {repair && <input type="hidden" name="repairId" value={repair.id} />}
      <Field label="Título" htmlFor={`${id}-title`}>
        <Input id={`${id}-title`} name="title" required defaultValue={repair?.title} placeholder="Ej: Pintura de la cocina" />
      </Field>
      <Field label="Descripción" htmlFor={`${id}-desc`}>
        <Textarea
          id={`${id}-desc`}
          name="description"
          rows={3}
          defaultValue={repair?.description}
          placeholder="Ej: Se pintó la cocina con 20 litros de pintura blanca"
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Estado</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { v: "PENDING", label: "Por hacer" },
              { v: "DONE", label: "Hecha" },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground"
            >
              <input
                type="radio"
                name="status"
                value={o.v}
                checked={status === o.v}
                onChange={() => setStatus(o.v)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {status === "DONE" ? (
          <>
            <Field label="Fecha" htmlFor={`${id}-date`}>
              <Input id={`${id}-date`} name="date" type="date" required defaultValue={repair?.date || todayInput()} />
            </Field>
            <Field label={inInstallments ? "Valor de cada cuota" : "Costo"} htmlFor={`${id}-cost`}>
              <MoneyInput
                id={`${id}-cost`}
                name="cost"
                required
                value={costText}
                onChange={(e) => setCostText(e.target.value)}
              />
            </Field>
            <input type="hidden" name="estimatedCost" value={centsToInput(repair?.estimatedCost)} />
            <div className="sm:col-span-2">
              <InstallmentFields
                enabled={inInstallments}
                onEnabledChange={setInInstallments}
                count={count}
                onCountChange={setCount}
                perInstallment={parseMoney(costText)}
                defaultFirst={repair?.firstInstallment}
              />
            </div>
          </>
        ) : (
          <>
            <Field label="Fecha prevista" htmlFor={`${id}-date`} hint="Opcional.">
              <Input id={`${id}-date`} name="date" type="date" defaultValue={repair?.date} />
            </Field>
            <Field label="Costo estimado" htmlFor={`${id}-est`} hint="Opcional.">
              <MoneyInput id={`${id}-est`} name="estimatedCost" defaultValue={centsToInput(repair?.estimatedCost)} />
            </Field>
          </>
        )}
      </div>
      <FormError state={state} />
      <DialogFooter>
        <SubmitButton>Guardar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
