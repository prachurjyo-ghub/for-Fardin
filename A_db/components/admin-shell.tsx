"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  BadgeDollarSign,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui";
import { useAuth } from "@/providers/auth-provider";
import { useResource } from "@/lib/use-resource";
import type { Page } from "@/lib/admin";
import { MobileBottomNav } from "./mobile-bottom-nav";

const groups: Array<[string, Array<[string, string, LucideIcon]>]> = [
  ["Overview", [["Dashboard", "/dashboard", Gauge]]],
  [
    "Commerce & sourcing",
    [
      ["Requests", "/requests", ClipboardList],
      ["Orders", "/orders", PackageCheck],
    ],
  ],
  [
    "Accounts",
    [
      ["Customers", "/customers", Users],
      ["Suppliers", "/suppliers", Building2],
      ["Subscriptions", "/subscriptions", BadgeDollarSign],
      ["Catalogue", "/catalogue", Boxes],
    ],
  ],
  [
    "Operations",
    [
      ["Finance", "/finance", CircleDollarSign],
      ["Messages", "/messages", MessageSquare],
      ["Issues & disputes", "/cases", LifeBuoy],
    ],
  ],
  ["Administration", [["Settings & audit", "/system", Settings2]]],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { account, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const notifications = useResource<Page>(
    "/communications/notifications?page=1&pageSize=8&unreadOnly=true",
  );
  const title =
    groups
      .flatMap((group) => group[1])
      .find((item) => path.startsWith(item[1]))?.[0] ?? "Operations";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_1fr]">
      <button
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/40 lg:hidden ${open ? "block" : "hidden"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-[#242628] text-stone-200 transition-transform lg:sticky lg:top-0 lg:h-screen ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${collapsed ? "lg:w-[82px]" : "lg:w-72"}`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-stone-100 font-black text-[#242628]">
            A
          </span>
          {!collapsed && (
            <div>
              <b className="block tracking-wide">PartsArc</b>
              <small className="text-stone-400">Operations control</small>
            </div>
          )}
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <nav className="scrollbar flex-1 overflow-y-auto p-3">
          {groups.map(([name, items]) => (
            <div key={name} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-black tracking-[.16em] text-stone-500">
                  {name.toUpperCase()}
                </p>
              )}
              {items.map(([label, href, Icon]) => {
                const active = path.startsWith(href);
                return (
                  <Link
                    key={href}
                    title={label}
                    href={href}
                    className={`relative mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold ${active ? "bg-white/10 text-white before:absolute before:left-0 before:h-6 before:w-0.5 before:bg-white" : "text-stone-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    <Icon size={19} />
                    {!collapsed && label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden w-full items-center gap-3 rounded-xl p-3 text-sm text-stone-400 hover:bg-white/5 lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}{" "}
            {!collapsed && "Collapse sidebar"}
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-7">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          {path.split("/").filter(Boolean).length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ChevronLeft />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black">{title}</p>
            <p className="text-xs text-muted-foreground">
              Asia/Dhaka operations · live API
            </p>
          </div>
          <div
            className="hidden rounded-xl border p-1 sm:flex"
            aria-label="Theme"
          >
            <button
              aria-label="Light theme"
              className={`rounded-lg p-2 ${theme === "light" ? "bg-muted" : ""}`}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} />
            </button>
            <button
              aria-label="Dark theme"
              className={`rounded-lg p-2 ${theme === "dark" ? "bg-muted" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} />
            </button>
            <button
              className={`rounded-lg px-2 text-xs font-bold ${theme === "system" ? "bg-muted" : ""}`}
              onClick={() => setTheme("system")}
            >
              Auto
            </button>
          </div>
          <div
            title={`${notifications.data?.total ?? 0} unread notifications`}
            className="relative rounded-xl border p-2.5"
          >
            <Bell size={18} />
            {Boolean(notifications.data?.total) && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-danger text-[10px] font-bold text-white">
                {Math.min(9, notifications.data!.total)}
              </span>
            )}
          </div>
          <div className="hidden text-right md:block">
            <b className="block text-sm">
              {account?.fullName || "Administrator"}
            </b>
            <small className="text-muted-foreground">
              {account?.role.replace("_", " ")}
            </small>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => void logout().then(() => router.replace("/login"))}
          >
            <LogOut size={18} />
          </Button>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 pb-24 md:p-7">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
