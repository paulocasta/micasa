"use client";

import { PackagePlusIcon, XIcon } from "lucide-react";
import { useActionState, useId, useMemo, useState } from "react";
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
import { todayInput } from "@/lib/dates";
import { formatQuantity } from "@/lib/money";
import { matchesQuery } from "@/lib/text";
import { UNITS } from "@/lib/constants";
import { addPurchase } from "@/server/pantry-actions";
import type { CategoryOption, ItemOption } from "./types";

export function PurchaseDialog({
  categories,
  items,
  defaultItemId,
  defaultCategoryId,
  trigger,
}: {
  categories: CategoryOption[];
  items: ItemOption[];
  defaultItemId?: number;
  defaultCategoryId?: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PackagePlusIcon aria-hidden /> Registrar compra
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>
            Si el artículo ya existe se suma al stock. El costo cuenta como gasto del mes.
          </DialogDescription>
        </DialogHeader>
        <PurchaseForm
          key={formKey}
          categories={categories}
          items={items}
          defaultItemId={defaultItemId}
          defaultCategoryId={defaultCategoryId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function PurchaseForm({
  categories,
  items,
  defaultItemId,
  defaultCategoryId,
  onDone,
}: {
  categories: CategoryOption[];
  items: ItemOption[];
  defaultItemId?: number;
  defaultCategoryId?: number;
  onDone: () => void;
}) {
  const [state, action] = useActionState(addPurchase, null);
  useActionFeedback(state, onDone);
  const id = useId();
  const [selected, setSelected] = useState<ItemOption | null>(
    items.find((i) => i.id === defaultItemId) ?? null,
  );
  const [name, setName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [categoryId, setCategoryId] = useState(String(defaultCategoryId ?? categories[0]?.id ?? ""));
  const subs = categories.find((c) => String(c.id) === categoryId)?.subcategories ?? [];

  const suggestions = useMemo(
    () => (name.trim() ? items.filter((i) => matchesQuery(name, i.name, i.brand)).slice(0, 6) : []),
    [items, name],
  );

  return (
    <form action={action} className="grid gap-4">
      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border bg-secondary/60 p-3">
          <input type="hidden" name="itemId" value={selected.id} />
          <div>
            <p className="font-medium">
              {selected.name} {selected.brand && <span className="text-muted-foreground">· {selected.brand}</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              En stock: {formatQuantity(selected.quantity)} {selected.unit}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <XIcon aria-hidden /> Cambiar
          </Button>
        </div>
      ) : (
        <>
          <Field label="Producto" htmlFor={`${id}-name`} className="relative">
            <Input
              id={`${id}-name`}
              name="name"
              required
              autoComplete="off"
              placeholder="Ej: Yerba mate"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                id={`${id}-list`}
                role="listbox"
                className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md"
              >
                {suggestions.map((s) => (
                  <li key={s.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelected(s);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>
                        {s.name} {s.brand && <span className="text-muted-foreground">· {s.brand}</span>}
                      </span>
                      <span className="text-xs text-muted-foreground tabular">
                        {formatQuantity(s.quantity)} {s.unit}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca" htmlFor={`${id}-brand`}>
              <Input id={`${id}-brand`} name="brand" placeholder="Ej: Playadito" autoComplete="off" />
            </Field>
            <Field label="Unidad" htmlFor={`${id}-unit`}>
              <NativeSelect id={`${id}-unit`} name="unit" defaultValue="paquete">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Categoría" htmlFor={`${id}-cat`}>
              <NativeSelect
                id={`${id}-cat`}
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Subcategoría" htmlFor={`${id}-sub`}>
              <NativeSelect id={`${id}-sub`} name="subcategoryId" disabled={!subs.length} key={categoryId}>
                <option value="">{subs.length ? "Sin subcategoría" : "No tiene"}</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Descripción" htmlFor={`${id}-desc`}>
            <Textarea id={`${id}-desc`} name="description" rows={2} placeholder="Opcional (ej: 1 kg, sin palo)" />
          </Field>
          <Field label="Stock mínimo" htmlFor={`${id}-min`} hint="Avisa cuando la cantidad llegue a este número.">
            <Input id={`${id}-min`} name="minStock" type="number" min={0} step="any" defaultValue={1} inputMode="decimal" />
          </Field>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cantidad" htmlFor={`${id}-qty`}>
          <Input
            id={`${id}-qty`}
            name="quantity"
            type="number"
            min={0}
            step="any"
            required
            defaultValue={1}
            inputMode="decimal"
            className="tabular"
          />
        </Field>
        <Field label="Costo total" htmlFor={`${id}-cost`}>
          <MoneyInput id={`${id}-cost`} name="cost" />
        </Field>
        <Field label="Fecha" htmlFor={`${id}-date`}>
          <Input id={`${id}-date`} name="date" type="date" defaultValue={todayInput()} required />
        </Field>
      </div>

      <FormError state={state} />
      <DialogFooter>
        <SubmitButton>Guardar compra</SubmitButton>
      </DialogFooter>
    </form>
  );
}
