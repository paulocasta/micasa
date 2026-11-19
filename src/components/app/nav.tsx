"use client";

import { HomeIcon, LandmarkIcon, LogOutIcon, ReceiptIcon, ShoppingBasketIcon, ShoppingCartIcon, WrenchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/server/auth-actions";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/despensa", label: "Despensa", icon: ShoppingBasketIcon },
  { href: "/compras", label: "Compras", icon: ShoppingCartIcon },
  { href: "/impuestos", label: "Impuestos", icon: LandmarkIcon },
  { href: "/reparaciones", label: "Reparaciones", icon: WrenchIcon },
  { href: "/gastos", label: "Varios", icon: ReceiptIcon },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <HomeIcon className="size-5" aria-hidden />
      </span>
      <span className="text-lg">Mi Casa</span>
    </Link>
  );
}

export function Sidebar({ authEnabled }: { authEnabled: boolean }) {
  const isActive = useActive();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar p-4 lg:flex">
      <div className="px-2 py-1">
        <Logo />
      </div>
      <nav aria-label="Secciones" className="mt-8 flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              isActive(href) && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between border-t pt-4">
        <ThemeToggle />
        {authEnabled && (
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOutIcon aria-hidden /> Salir
            </Button>
          </form>
        )}
      </div>
    </aside>
  );
}

export function MobileHeader({ authEnabled }: { authEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        {authEnabled && (
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
              <LogOutIcon aria-hidden />
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex h-16 min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors duration-200",
            isActive(href) && "text-primary",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
