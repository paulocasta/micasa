"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { ConfirmAction } from "@/components/app/confirm-action";
import { Field, FormError, NativeSelect, SubmitButton, useActionFeedback } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UNITS } from "@/lib/constants";
import { consumeStock, deleteMovement, updateItem } from "@/server/pantry-actions";
import type { CategoryOption } from "../types";

export function ConsumeForm({ itemId, unit }: { itemId: number; unit: string }) {
  const [state, action] = useActionState(consumeStock, null);
  const ref = useRef<HTMLFormElement>(null);
  useActionFeedback(state, () => ref.current?.reset());
  const id = useId();
  return (
    <form ref={ref} action={action} className="flex items-end gap-2">
      <input type="hidden" name="itemId" value={itemId} />
      <Field label={`Usar cantidad (${unit})`} htmlFor={id} className="flex-1">
        <Input id={id} name="quantity" type="number" min={0} step="any" inputMode="decimal" required placeholder="0" />
      </Field>
      <SubmitButton variant="secondary">Descontar</SubmitButton>
    </form>
  );
}

type EditableItem = {
  id: number;
  name: string;
  brand: string;
  description: string;
  unit: string;
  minStock: number;
  categoryId: number;
  subcategoryId: number | null;
};

export function EditItemForm({ item, categories }: { item: EditableItem; categories: CategoryOption[] }) {
  const [state, action] = useActionState(updateItem, null);
  useActionFeedback(state);
  const id = useId();
  const [categoryId, setCategoryId] = useState(String(item.categoryId));
  const subs = categories.find((c) => String(c.id) === categoryId)?.subcategories ?? [];
  const units = UNITS.includes(item.unit) ? UNITS : [item.unit, ...UNITS];

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Producto" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} name="name" defaultValue={item.name} required />
        </Field>
        <Field label="Marca" htmlFor={`${id}-brand`}>
          <Input id={`${id}-brand`} name="brand" defaultValue={item.brand} />
        </Field>
        <Field label="Categoría" htmlFor={`${id}-cat`}>
          <NativeSelect id={`${id}-cat`} name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Subcategoría" htmlFor={`${id}-sub`}>
          <NativeSelect
            key={categoryId}
            id={`${id}-sub`}
            name="subcategoryId"
            disabled={!subs.length}
            defaultValue={String(categoryId) === String(item.categoryId) ? (item.subcategoryId ?? "") : ""}
          >
            <option value="">{subs.length ? "Sin subcategoría" : "No tiene"}</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Unidad" htmlFor={`${id}-unit`}>
          <NativeSelect id={`${id}-unit`} name="unit" defaultValue={item.unit}>
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Stock mínimo" htmlFor={`${id}-min`}>
          <Input id={`${id}-min`} name="minStock" type="number" min={0} step="any" defaultValue={item.minStock} />
        </Field>
      </div>
      <Field label="Descripción" htmlFor={`${id}-desc`}>
        <Textarea id={`${id}-desc`} name="description" rows={2} defaultValue={item.description} />
      </Field>
      <FormError state={state} />
      <div className="flex justify-end">
        <SubmitButton>Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}

export function MovementDelete({ id }: { id: number }) {
  return (
    <ConfirmAction
      title="¿Eliminar movimiento?"
      description="Se revierte el cambio de stock y, si era una compra, deja de contar como gasto."
      action={deleteMovement.bind(null, id)}
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label="Eliminar movimiento">
          <Trash2Icon aria-hidden />
        </Button>
      }
    />
  );
}
