"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { InstallmentFields } from "@/components/app/installment-fields";
import { Field, FormError, MoneyInput, NativeSelect, SubmitButton, useActionFeedback } from "@/components/app/ui";
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
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";
import { todayInput } from "@/lib/dates";
import { centsToInput, parseMoney } from "@/lib/money";
import { saveExpense } from "@/server/expense-actions";

export type ExpenseView = {
  id: number;
  description: string;
  category: string;
  date: string;
  amount: number;
  paymentMethod: string;
  store: string;
  notes: string;
  installmentNumber: number | null;
  installmentCount: number | null;
};

export function ExpenseDialog({ expense }: { expense?: ExpenseView }) {
  const [open, setOpen] = useState(false);
  const trigger = !expense ? (
    <Button>
      <PlusIcon aria-hidden /> Nuevo gasto
    </Button>
  ) : (
    <Button variant="ghost" size="icon" aria-label={`Editar ${expense.description}`}>
      <PencilIcon aria-hidden />
    </Button>
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {!expense
              ? "Nuevo gasto"
              : expense.installmentCount
                ? `Editar cuota ${expense.installmentNumber}/${expense.installmentCount}`
                : "Editar gasto"}
          </DialogTitle>
          <DialogDescription>Remedios, artículos de limpieza, ferretería y otras compras sueltas.</DialogDescription>
        </DialogHeader>
        {open && <ExpenseForm expense={expense} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({ expense, onDone }: { expense?: ExpenseView; onDone: () => void }) {
  const [state, action] = useActionState(saveExpense, null);
  useActionFeedback(state, onDone);
  const id = useId();
  const method = expense?.paymentMethod ?? "";
  const methods =
    method && !PAYMENT_METHODS.includes(method as never) ? [method, ...PAYMENT_METHODS] : [...PAYMENT_METHODS];
  const [inInstallments, setInInstallments] = useState(false);
  const [count, setCount] = useState(6);
  const [amountText, setAmountText] = useState(centsToInput(expense?.amount));

  return (
    <form action={action} className="grid gap-4">
      {expense && <input type="hidden" name="expenseId" value={expense.id} />}
      <Field label="Qué compraste" htmlFor={`${id}-desc`}>
        <Input
          id={`${id}-desc`}
          name="description"
          required
          defaultValue={expense?.description}
          placeholder="Ej: Ibuprofeno 600, balde y escoba"
        />
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Categoría</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPENSE_CATEGORIES.map((c) => (
            <label
              key={c}
              className="flex h-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="category"
                value={c}
                defaultChecked={(expense?.category ?? "Farmacia") === c}
                className="sr-only"
              />
              {c}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={inInstallments ? "Fecha de compra" : expense?.installmentCount ? "Fecha de la cuota" : "Fecha"} htmlFor={`${id}-date`}>
          <Input id={`${id}-date`} name="date" type="date" required defaultValue={expense?.date || todayInput()} />
        </Field>
        <Field label={inInstallments || expense?.installmentCount ? "Valor de cada cuota" : "Monto"} htmlFor={`${id}-amount`}>
          <MoneyInput
            id={`${id}-amount`}
            name="amount"
            required
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
          />
        </Field>
        {!expense && (
          <div className="sm:col-span-2">
            <InstallmentFields
              enabled={inInstallments}
              onEnabledChange={setInInstallments}
              count={count}
              onCountChange={setCount}
              perInstallment={parseMoney(amountText)}
            />
          </div>
        )}
        <Field label="Medio de pago" htmlFor={`${id}-method`} hint="Opcional.">
          <NativeSelect id={`${id}-method`} name="paymentMethod" defaultValue={method}>
            <option value="">Sin especificar</option>
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Comercio" htmlFor={`${id}-store`} hint="Opcional.">
          <Input id={`${id}-store`} name="store" defaultValue={expense?.store} placeholder="Ej: Farmacia del centro" />
        </Field>
      </div>
      <Field label="Notas" htmlFor={`${id}-notes`} hint="Opcional.">
        <Textarea id={`${id}-notes`} name="notes" rows={2} defaultValue={expense?.notes} />
      </Field>
      <FormError state={state} />
      <DialogFooter>
        <SubmitButton>Guardar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
