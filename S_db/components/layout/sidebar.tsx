"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navSections, profileNav } from "@/components/layout/nav-config";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[35] bg-[rgba(2,12,24,0.4)] transition-opacity min-[1051px]:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "portal-sidebar fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col bg-gradient-to-b from-navy to-[#071a2e] px-3.5 pb-[18px] pt-6 text-[#d5dfeb] shadow-[8px_0_30px_rgba(0,20,40,0.12)] transition-transform duration-250 min-[1051px]:translate-x-0",
          open && "open !translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center gap-[11px] px-2.5">
          <span className="grid size-9 rotate-45 place-items-center rounded-[9px] border-2 border-[#1680ff] font-heading text-lg font-extrabold text-white">
            <span className="-rotate-45">A</span>
          </span>
          <span className="flex flex-col">
            <strong className="font-heading text-lg font-extrabold tracking-[0.3px] text-white">
              AUTO<span className="text-[#1680ff]">PRO</span>
            </strong>
            <small className="text-[9px] tracking-[1.7px] text-[#8394a9]">
              SUPPLIER PORTAL
            </small>
          </span>
        </div>

        <nav className="flex flex-col gap-1.5" aria-label="Supplier portal">
          {navSections.map((section, idx) => (
            <div key={section.label ?? idx}>
              {section.label ? (
                <div className="px-3 pb-1.5 pt-5 text-[9px] font-bold tracking-[1.5px] text-[#63758a]">
                  {section.label}
                </div>
              ) : null}
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-[11px] rounded-[10px] px-3 text-left font-semibold text-[#c5d0dd] transition hover:bg-[#102b45] hover:text-white",
                      active &&
                        "bg-blue text-white shadow-[0_8px_20px_rgba(8,104,255,0.28)] hover:bg-blue",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <b className="rounded-[9px] bg-white px-1.5 py-0.5 text-[11px] text-blue">
                        {item.count}
                      </b>
                    ) : null}
                    {item.unread ? (
                      <i className="ml-auto size-[7px] rounded-full bg-[#29d39b]" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto">
          <Link
            href={profileNav.href}
            onClick={onClose}
            className={cn(
              "flex min-h-11 w-full items-center gap-[11px] rounded-[10px] px-3 font-semibold text-[#c5d0dd] transition hover:bg-[#102b45] hover:text-white",
              pathname === profileNav.href &&
                "bg-blue text-white shadow-[0_8px_20px_rgba(8,104,255,0.28)]",
            )}
          >
            <profileNav.icon className="size-5" />
            {profileNav.label}
          </Link>
          <div className="mt-3.5 flex flex-col gap-1.5 rounded-[13px] border border-[#1b3b58] bg-[#0c243b] p-3.5">
            <small className="text-[9px] tracking-wide text-[#7990a7]">
              SUPPLIER SUPPORT
            </small>
            <strong className="text-xs text-[#eef5fd]">
              Need help with an order?
            </strong>
            <Link
              href="/messages"
              className="border-0 bg-transparent p-0 text-left text-xs font-bold text-[#55a4ff]"
            >
              Contact operations
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
