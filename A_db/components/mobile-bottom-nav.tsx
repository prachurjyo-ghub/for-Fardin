"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  LifeBuoy,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const direct = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/orders", label: "Orders", icon: PackageCheck },
] as const;

const more = [
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/subscriptions", label: "Subscriptions", icon: BadgeDollarSign },
  { href: "/catalogue", label: "Catalogue", icon: Boxes },
  { href: "/finance", label: "Finance", icon: CircleDollarSign },
  { href: "/cases", label: "Issues & disputes", icon: LifeBuoy },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/system", label: "Settings & audit", icon: Settings2 },
] as const;

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = more.some((item) => active(pathname, item.href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background/95 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_28px_rgba(0,0,0,.12)] backdrop-blur md:hidden"
      aria-label="Admin mobile navigation"
    >
      {direct.map((item) => {
        const Icon = item.icon;
        const selected = active(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold ${selected ? "text-foreground" : "text-muted-foreground"}`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold ${moreActive ? "text-foreground" : "text-muted-foreground"}`}
            aria-label="Open more admin navigation"
          >
            <MoreHorizontal size={20} />
            More
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-[61] max-h-[78dvh] overflow-y-auto rounded-t-2xl border-t bg-background p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl focus:outline-none">
            <div className="pr-12">
              <Dialog.Title className="text-lg font-black">
                More operations
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Accounts, catalogue, finance, and administration.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-xl border"
              aria-label="Close more navigation"
            >
              <X size={20} />
            </Dialog.Close>
            <div className="grid gap-2 py-5 sm:grid-cols-2">
              {more.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-xl border px-4 text-sm font-bold"
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </nav>
  );
}
