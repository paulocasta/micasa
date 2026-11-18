"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, start] = useTransition();

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value.trim() === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(t);
  }, [value, params, pathname, router]);

  return (
    <InputGroup className="sm:max-w-sm">
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label="Buscar artículos"
        placeholder="Buscar por nombre, marca o descripción"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Limpiar búsqueda" onClick={() => setValue("")}>
            <XIcon aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
