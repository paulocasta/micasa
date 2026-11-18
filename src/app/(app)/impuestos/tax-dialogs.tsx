"use client";

import { CheckCircle2Icon, MoreVerticalIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useActionState, useId, useState, useTransition } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Field, FormError, MoneyInput, NativeSelect, runAction, SubmitButton, useActionFeedback } from "@/components/app/ui";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AUTO_DEBIT_METHOD, PAYMENT_METHODS } from "@/lib/constants";
import { periodOf, todayInput } from "@/lib/dates";
import { centsToInput } from "@/lib/money";
import type { ActionResult } from "@/server/action-result";
import {
  createRecurring,
  createTax,
  deleteRecurring,
  deleteTax,
  markTaxPending,
  payTax,
  updateRecurring,
  updateTax,
} from "@/server/tax-actions";

export type TaxView = {
  id: number;
  name: string;
  title: string;
  period: string;
  status: "PENDING" | "PAID";
  dueDate: string;
  paidAt: string;
  paymentMethod: string;
  amount: number | null;
  notes: string;
};

export type RecurringView = {
  id: number;
  name: string;
  mode: "MANUAL" | "AUTO_DEBIT";
  defaultAmount: number | null;
  paymentMethod: string;
  dueDay: number;
  startPeriod: string;
  active: boolean;
};

type FormAction = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

/** Diálogo con formulario que se resetea al abrir y se cierra al guardar. */
function FormDialog({
  trigger,
  title,
  description,
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children: (close: () => void) => React.ReactNode;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  action,
  onDone,
  submitLabel,
  children,
}: {
  action: FormAction;
  onDone: () => void;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  useActionFeedback(state, onDone);
  return (
    <form action={formAction} className="grid gap-4">
      {children}
      <FormError state={state} />
      <DialogFooter>
        <SubmitButton>{submitLabel}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

function PaymentMethodSelect({ id, defaultValue }: { id: string; defaultValue?: string }) {
  const options = defaultValue && !PAYMENT_METHODS.includes(defaultValue as never) ? [defaultValue, ...PAYMENT_METHODS] : PAYMENT_METHODS;
  return (
    <NativeSelect id={id} name="paymentMethod" defaultValue={defaultValue || ""} required>
      <option value="" disabled>
        Elegí un medio
      </option>
      {options.map((m) => (
        <option key={m}>{m}</option>
      ))}
    </NativeSelect>
  );
}

function PaymentFields({ amount, paidAt, method }: { amount?: number | null; paidAt?: string; method?: string }) {
  const id = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha de pago" htmlFor={`${id}-paid`}>
        <Input id={`${id}-paid`} name="paidAt" type="date" required defaultValue={paidAt || todayInput()} />
      </Field>
      <Field label="Medio de pago" htmlFor={`${id}-method`}>
        <PaymentMethodSelect id={`${id}-method`} defaultValue={method} />
      </Field>
      <Field label="Monto pagado" htmlFor={`${id}-amount`} className="sm:col-span-2">
        <MoneyInput id={`${id}-amount`} name="amount" required defaultValue={centsToInput(amount)} />
      </Field>
    </div>
  );
}

export function NewTaxDialog() {
  const id = useId();
  const [paid, setPaid] = useState(false);
  return (
    <FormDialog
      title="Nuevo impuesto"
      description="Para un pago puntual. Los que se repiten todos los meses cargalos como recurrentes."
      trigger={
        <Button>
          <PlusIcon aria-hidden /> Nuevo impuesto
        </Button>
      }
    >
      {(close) => (
        <ActionForm action={createTax} onDone={close} submitLabel="Guardar">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor={`${id}-name`} className="sm:col-span-2">
              <Input id={`${id}-name`} name="name" required placeholder="Ej: Luz EPE" />
            </Field>
            <Field label="Mes" htmlFor={`${id}-period`}>
              <Input id={`${id}-period`} name="period" type="month" required defaultValue={periodOf(new Date())} />
            </Field>
            <Field label="Vencimiento" htmlFor={`${id}-due`}>
              <Input id={`${id}-due`} name="dueDate" type="date" />
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Estado</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: false, label: "Pendiente" },
                { v: true, label: "Pagado" },
              ].map((o) => (
                <label
                  key={o.label}
                  className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground"
                >
                  <input
                    type="radio"
                    name="status"
                    value={o.v ? "PAID" : "PENDING"}
                    checked={paid === o.v}
                    onChange={() => setPaid(o.v)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          {paid ? (
            <PaymentFields />
          ) : (
            <Field label="Monto (si ya lo sabés)" htmlFor={`${id}-amount`}>
              <MoneyInput id={`${id}-amount`} name="amount" />
            </Field>
          )}
          <Field label="Notas" htmlFor={`${id}-notes`}>
            <Textarea id={`${id}-notes`} name="notes" rows={2} />
          </Field>
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function PayTaxButton({ tax }: { tax: TaxView }) {
  return (
    <FormDialog
      title={`Pagar ${tax.title}`}
      description="Registrá cuándo, cómo y cuánto pagaste."
      trigger={
        <Button size="sm" variant="secondary">
          <CheckCircle2Icon aria-hidden /> Marcar pagado
        </Button>
      }
    >
      {(close) => (
        <ActionForm action={payTax} onDone={close} submitLabel="Registrar pago">
          <input type="hidden" name="taxId" value={tax.id} />
          <PaymentFields amount={tax.amount} />
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function TaxMenu({ tax }: { tax: TaxView }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, start] = useTransition();
  const id = useId();
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Opciones de ${tax.title}`}>
            <MoreVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon aria-hidden /> Editar
          </DropdownMenuItem>
          {tax.status === "PAID" && (
            <DropdownMenuItem onSelect={() => start(async () => void (await runAction(markTaxPending(tax.id))))}>
              <RotateCcwIcon aria-hidden /> Marcar pendiente
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2Icon aria-hidden /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FormDialog title={`Editar ${tax.title}`} open={editing} onOpenChange={setEditing}>
        {(close) => (
          <ActionForm action={updateTax} onDone={close} submitLabel="Guardar cambios">
            <input type="hidden" name="taxId" value={tax.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre" htmlFor={`${id}-name`} className="sm:col-span-2">
                <Input id={`${id}-name`} name="name" required defaultValue={tax.name} />
              </Field>
              <Field label="Mes" htmlFor={`${id}-period`}>
                <Input id={`${id}-period`} name="period" type="month" required defaultValue={tax.period} />
              </Field>
              <Field label="Vencimiento" htmlFor={`${id}-due`}>
                <Input id={`${id}-due`} name="dueDate" type="date" defaultValue={tax.dueDate} />
              </Field>
              {tax.status === "PAID" ? (
                <>
                  <Field label="Fecha de pago" htmlFor={`${id}-paid`}>
                    <Input id={`${id}-paid`} name="paidAt" type="date" required defaultValue={tax.paidAt} />
                  </Field>
                  <Field label="Medio de pago" htmlFor={`${id}-method`}>
                    <PaymentMethodSelect id={`${id}-method`} defaultValue={tax.paymentMethod} />
                  </Field>
                </>
              ) : null}
              <Field label="Monto" htmlFor={`${id}-amount`} className="sm:col-span-2">
                <MoneyInput id={`${id}-amount`} name="amount" defaultValue={centsToInput(tax.amount)} />
              </Field>
            </div>
            <Field label="Notas" htmlFor={`${id}-notes`}>
              <Textarea id={`${id}-notes`} name="notes" rows={2} defaultValue={tax.notes} />
            </Field>
          </ActionForm>
        )}
      </FormDialog>

      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`¿Eliminar ${tax.title}?`}
        action={() => deleteTax(tax.id)}
      />
    </>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  action: () => Promise<ActionResult>;
}) {
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await runAction(action());
                if (res.ok) onOpenChange(false);
              })
            }
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecurringFields({ rt }: { rt?: RecurringView }) {
  const id = useId();
  const [mode, setMode] = useState<RecurringView["mode"]>(rt?.mode ?? "MANUAL");
  return (
    <>
      <Field label="Nombre" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} name="name" required defaultValue={rt?.name} placeholder="Ej: Luz EPE, Internet" />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { v: "MANUAL", label: "Pago manual", hint: "Crea todo el año como pendiente" },
              { v: "AUTO_DEBIT", label: "Débito automático", hint: "Cada mes se registra como pagado" },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className="flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-secondary has-disabled:cursor-not-allowed has-disabled:opacity-60"
            >
              <input
                type="radio"
                name="mode"
                value={o.v}
                checked={mode === o.v}
                onChange={() => setMode(o.v)}
                className="sr-only"
              />
              <span className="font-medium">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={mode === "AUTO_DEBIT" ? "Monto mensual" : "Monto estimado"}
          htmlFor={`${id}-amount`}
          hint={mode === "AUTO_DEBIT" ? "Se usa para cada débito; podés editarlo después." : "Opcional."}
        >
          <MoneyInput
            id={`${id}-amount`}
            name="defaultAmount"
            required={mode === "AUTO_DEBIT"}
            defaultValue={centsToInput(rt?.defaultAmount)}
          />
        </Field>
        <Field label={mode === "AUTO_DEBIT" ? "Día de débito" : "Día de vencimiento"} htmlFor={`${id}-day`}>
          <Input id={`${id}-day`} name="dueDay" type="number" min={1} max={31} required defaultValue={rt?.dueDay ?? 10} />
        </Field>
        {mode === "AUTO_DEBIT" && (
          <Field label="Medio" htmlFor={`${id}-method`}>
            <NativeSelect id={`${id}-method`} name="paymentMethod" defaultValue={rt?.paymentMethod || AUTO_DEBIT_METHOD}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </NativeSelect>
          </Field>
        )}
        {!rt && (
          <Field label="Desde" htmlFor={`${id}-start`}>
            <Input id={`${id}-start`} name="startPeriod" type="month" required defaultValue={periodOf(new Date())} />
          </Field>
        )}
      </div>
      {rt && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={rt.active} className="size-5 accent-primary" />
          Activo (sigue generando entradas)
        </label>
      )}
    </>
  );
}

export function NewRecurringDialog() {
  return (
    <FormDialog
      title="Nuevo recurrente"
      description="Se generan entradas automáticamente cada mes."
      trigger={
        <Button variant="outline">
          <PlusIcon aria-hidden /> Nuevo recurrente
        </Button>
      }
    >
      {(close) => (
        <ActionForm action={createRecurring} onDone={close} submitLabel="Crear">
          <RecurringFields />
        </ActionForm>
      )}
    </FormDialog>
  );
}

export function RecurringActions({ rt }: { rt: RecurringView }) {
  return (
    <div className="flex gap-1">
      <FormDialog
        title={`Editar ${rt.name}`}
        description="Los cambios se aplican también a las entradas pendientes desde este mes."
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Editar ${rt.name}`}>
            <PencilIcon aria-hidden />
          </Button>
        }
      >
        {(close) => (
          <ActionForm action={updateRecurring} onDone={close} submitLabel="Guardar cambios">
            <input type="hidden" name="recurringId" value={rt.id} />
            <RecurringFields rt={rt} />
          </ActionForm>
        )}
      </FormDialog>
      <ConfirmAction
        title={`¿Eliminar ${rt.name}?`}
        description="Se borran las entradas pendientes desde este mes. Las pagadas se conservan."
        action={deleteRecurring.bind(null, rt.id)}
        trigger={
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${rt.name}`}>
            <Trash2Icon aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
