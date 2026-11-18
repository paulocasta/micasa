import { AlertTriangleIcon, ChevronRightIcon, PackageOpenIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { matchesQuery } from "@/lib/text";
import { cn } from "@/lib/utils";
import { CategoryManager } from "./category-manager";
import { PurchaseDialog } from "./purchase-dialog";
import { SearchBox } from "./search-box";
import { StockStepper } from "./stock-stepper";

export const metadata: Metadata = { title: "Despensa" };

function href(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
  const s = sp.toString();
  return s ? `/despensa?${s}` : "/despensa";
}

const chip =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
const chipActive = "border-primary bg-primary text-primary-foreground hover:bg-primary/90";

export default async function DespensaPage({ searchParams }: PageProps<"/despensa">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q") ?? "";
  const cat = one("cat");
  const sub = one("sub");
  const low = one("bajo") === "1";

  const [categories, items] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" }, include: { subcategories: { orderBy: { name: "asc" } } } }),
    db.pantryItem.findMany({ orderBy: { name: "asc" }, include: { category: true, subcategory: true } }),
  ]);

  const category = categories.find((c) => c.slug === cat);
  const isLow = (i: (typeof items)[number]) => i.quantity <= i.minStock;
  const lowCount = items.filter(isLow).length;

  const visible = items.filter(
    (i) =>
      (!category || i.categoryId === category.id) &&
      (!sub || String(i.subcategoryId) === sub) &&
      (!low || isLow(i)) &&
      matchesQuery(q, i.name, i.brand, i.description, i.category.name, i.subcategory?.name),
  );

  const counts = new Map<number, number>();
  for (const i of items) counts.set(i.categoryId, (counts.get(i.categoryId) ?? 0) + 1);

  const categoryOptions = categories.map(({ id, name, slug, subcategories }) => ({
    id,
    name,
    slug,
    subcategories: subcategories.map(({ id, name }) => ({ id, name })),
  }));
  const itemOptions = items.map(({ id, name, brand, unit, quantity }) => ({ id, name, brand, unit, quantity }));

  return (
    <>
      <PageHeader
        title="Despensa"
        description="Stock de alimentos y provisiones de la casa."
        actions={
          <>
            <CategoryManager categories={categoryOptions} />
            <PurchaseDialog categories={categoryOptions} items={itemOptions} defaultCategoryId={category?.id} />
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <SearchBox />
        </Suspense>
        {lowCount > 0 && (
          <Link
            href={href({ q: q || undefined, cat, sub, bajo: low ? undefined : "1" })}
            className={cn(chip, low ? "border-warning bg-warning-soft text-warning" : "text-warning")}
            aria-pressed={low}
          >
            <AlertTriangleIcon className="size-4" aria-hidden />
            {lowCount} con stock bajo
          </Link>
        )}
      </div>

      <nav aria-label="Categorías" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={href({ q: q || undefined, bajo: low ? "1" : undefined })} className={cn(chip, !category && chipActive)}>
          Todas <span className="tabular opacity-75">{items.length}</span>
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={href({ cat: c.slug, q: q || undefined, bajo: low ? "1" : undefined })}
            aria-current={category?.id === c.id ? "page" : undefined}
            className={cn(chip, category?.id === c.id && chipActive)}
          >
            {c.name} <span className="tabular opacity-75">{counts.get(c.id) ?? 0}</span>
          </Link>
        ))}
      </nav>

      {category && category.subcategories.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link
            href={href({ cat: category.slug, q: q || undefined, bajo: low ? "1" : undefined })}
            className={cn(chip, "h-9 bg-card", !sub && "border-primary text-primary")}
          >
            Todas
          </Link>
          {category.subcategories.map((s) => (
            <Link
              key={s.id}
              href={href({ cat: category.slug, sub: String(s.id), q: q || undefined, bajo: low ? "1" : undefined })}
              className={cn(chip, "h-9 bg-card", sub === String(s.id) && "border-primary text-primary")}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={<PackageOpenIcon aria-hidden />} title={items.length ? "Sin resultados" : "La despensa está vacía"}>
          {items.length
            ? "Probá con otra búsqueda o categoría."
            : "Registrá tu primera compra para empezar a llevar el stock."}
        </EmptyState>
      ) : (
        <Card className="gap-0 divide-y py-0">
          {visible.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Link
                href={`/despensa/${i.id}`}
                className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium group-hover:text-primary">
                    {i.name}
                    {i.brand && <span className="font-normal text-muted-foreground"> · {i.brand}</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{i.category.name}</span>
                    {i.subcategory && <span>· {i.subcategory.name}</span>}
                    {isLow(i) && (
                      <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">
                        Stock bajo
                      </Badge>
                    )}
                  </div>
                  {i.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{i.description}</p>}
                </div>
                <ChevronRightIcon className="hidden size-4 text-muted-foreground sm:block" aria-hidden />
              </Link>
              <StockStepper itemId={i.id} name={i.name} quantity={i.quantity} unit={i.unit} low={isLow(i)} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
