"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { NativeSelect } from "./ui";

export type FilterDef = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/** Selects que actualizan la URL (filtros con enlace directo). */
export function UrlFilters({ filters, className }: { filters: FilterDef[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <div className={cn("flex flex-wrap gap-2", className)} aria-busy={pending}>
      {filters.map((f) => (
        <NativeSelect
          key={f.name}
          aria-label={f.label}
          value={f.value}
          className="w-auto min-w-32 bg-card"
          onChange={(e) => {
            const next = new URLSearchParams(params);
            next.set(f.name, e.target.value);
            start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
          }}
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      ))}
    </div>
  );
}
