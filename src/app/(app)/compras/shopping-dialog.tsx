"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Field, FormError, SubmitButton, useActionFeedback } from "@/components/app/ui";
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
import { saveShoppingItem } from "@/server/shopping-actions";

export type ShoppingItemView = { id: number; name: string; notes: string };

export function ShoppingDialog({ item }: { item?: ShoppingItemView }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${item.name}`}>
            <PencilIcon aria-hidden />
          </Button>
        ) : (
          <Button>
            <PlusIcon aria-hidden /> Nueva compra
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar compra" : "Nueva compra"}</DialogTitle>
          <DialogDescription>Cuando la compres, marcala como comprada y sale de la lista.</DialogDescription>
        </DialogHeader>
        {open && <ShoppingForm item={item} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ShoppingForm({ item, onDone }: { item?: ShoppingItemView; onDone: () => void }) {
  const [state, action] = useActionState(saveShoppingItem, null);
  useActionFeedback(state, onDone);
  const id = useId();

  return (
    <form action={action} className="grid gap-4">
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <Field label="Qué comprar" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} name="name" required defaultValue={item?.name} placeholder="Ej: Cubiertos Tramontina" />
      </Field>
      <Field label="Notas" htmlFor={`${id}-notes`} hint="Opcional.">
        <Textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          defaultValue={item?.notes}
          placeholder="Ej: Juego de 24 piezas"
        />
      </Field>
      <FormError state={state} />
      <DialogFooter>
        <SubmitButton>Guardar</SubmitButton>
      </DialogFooter>
    </form>
  );
}
