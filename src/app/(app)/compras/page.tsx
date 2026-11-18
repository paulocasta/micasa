import { CheckIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ConfirmAction } from "@/components/app/confirm-action";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { completeShoppingItem, deleteShoppingItem } from "@/server/shopping-actions";
import { ShoppingDialog } from "./shopping-dialog";

export const metadata: Metadata = { title: "Compras" };

export default async function ComprasPage() {
  await connection();
  const items = await db.shoppingItem.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Compras"
        description="Cosas que hay que comprar para la casa."
        actions={<ShoppingDialog />}
      />

      {items.length === 0 ? (
        <EmptyState icon={<ShoppingCartIcon aria-hidden />} title="Nada por comprar">
          Anotá lo que haga falta comprar y marcalo cuando lo compres.
        </EmptyState>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {items.map((i) => (
            <article key={i.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="font-medium">{i.name}</h2>
                {i.notes && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{i.notes}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Anotado el {formatDate(i.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1">
                <ConfirmAction
                  title={`¿Ya compraste "${i.name}"?`}
                  description="Se va a quitar de la lista."
                  confirmLabel="Comprado"
                  variant="default"
                  action={completeShoppingItem.bind(null, i.id)}
                  trigger={
                    <Button size="sm" variant="secondary">
                      <CheckIcon aria-hidden /> Comprado
                    </Button>
                  }
                />
                <ShoppingDialog item={{ id: i.id, name: i.name, notes: i.notes ?? "" }} />
                <ConfirmAction
                  title={`¿Eliminar "${i.name}"?`}
                  action={deleteShoppingItem.bind(null, i.id)}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Eliminar ${i.name}`}>
                      <Trash2Icon aria-hidden />
                    </Button>
                  }
                />
              </div>
            </article>
          ))}
        </Card>
      )}
    </>
  );
}
