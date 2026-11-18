"use client";

import { PlusIcon, Settings2Icon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { runAction } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addSubcategory, deleteSubcategory } from "@/server/pantry-actions";
import type { CategoryOption } from "./types";

export function CategoryManager({ categories }: { categories: CategoryOption[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2Icon aria-hidden /> Categorías
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subcategorías</DialogTitle>
          <DialogDescription>Agregá o quitá subcategorías de cada categoría.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ category }: { category: CategoryOption }) {
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">{category.name}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {category.subcategories.length === 0 && <li className="text-sm text-muted-foreground">Sin subcategorías</li>}
        {category.subcategories.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-1 pr-1 pl-3 text-sm">
            {s.name}
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              aria-label={`Quitar ${s.name}`}
              disabled={pending}
              onClick={() => start(async () => void (await runAction(deleteSubcategory(s.id))))}
            >
              <XIcon aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await runAction(addSubcategory(category.id, name));
            if (res.ok) setName("");
          });
        }}
      >
        <Input
          aria-label={`Nueva subcategoría de ${category.name}`}
          placeholder="Nueva subcategoría"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={pending || !name.trim()}>
          <PlusIcon aria-hidden /> Agregar
        </Button>
      </form>
    </section>
  );
}
