"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineEllipsisHorizontal,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const direct = [
  { href: "/dashboard", label: "Overview", icon: HiOutlineHome },
  { href: "/listings", label: "My Listings", icon: HiOutlineSquares2X2 },
  { href: "/requests", label: "Requests", icon: HiOutlineClipboardDocumentList },
] as const;

const more = [
  { href: "/orders", label: "Orders", icon: HiOutlineShoppingBag },
  { href: "/quotations", label: "Quotations", icon: HiOutlineDocumentText },
  { href: "/credit-wallet", label: "Credit Wallet", icon: HiOutlineCreditCard },
  { href: "/account", label: "Business & Account", icon: HiOutlineCog6Tooth },
] as const;

function active(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const moreActive = more.some((item) => active(pathname, item.href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-line bg-surface/95 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_28px_rgba(7,26,46,.12)] backdrop-blur min-[769px]:hidden"
      aria-label="Supplier mobile navigation"
    >
      {direct.map((item) => {
        const selected = active(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold ${selected ? "text-brand" : "text-muted-text"}`}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger
          className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold ${moreActive ? "text-brand" : "text-muted-text"}`}
          aria-label="Open more supplier navigation"
        >
          <HiOutlineEllipsisHorizontal className="size-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto rounded-t-2xl px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>More supplier tools</SheetTitle>
            <SheetDescription>Orders, finance, and business settings.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 py-4">
            {more.map((item) => {
              const Icon = item.icon;
              return (
                <SheetClose
                  key={item.href}
                  nativeButton={false}
                  render={
                    <Link href={item.href} className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-4 font-bold text-ink" />
                  }
                >
                  <Icon className="size-5 text-brand" />
                  {item.label}
                </SheetClose>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
