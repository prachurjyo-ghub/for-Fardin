"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBuildingStorefront,
} from "react-icons/hi2";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

const publicRoutes = new Set(["/login", "/accept-invitation"]);

const statusCopy = {
  DRAFT: {
    title: "Business activation is pending",
    body: "Your owner account is ready, but this business is still in draft. An PartsArc administrator must submit and activate it before supplier tools become available.",
  },
  PENDING_REVIEW: {
    title: "Business is under review",
    body: "Your account is active and the business is awaiting PartsArc approval. Supplier tools will unlock after an administrator activates the business.",
  },
  SUSPENDED: {
    title: "Business access is suspended",
    body: "PartsArc has paused access for this business. Contact operations or your administrator for help; signing in does not bypass the restriction.",
  },
  CLOSED: {
    title: "Business access is closed",
    body: "This supplier business is no longer operational on PartsArc. Contact operations if you believe this status is incorrect.",
  },
} as const;

function FullPageLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-md animate-pulse space-y-4 rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-line" />
        <div className="h-6 w-2/3 rounded bg-line" />
        <div className="h-4 w-full rounded bg-line" />
        <div className="h-4 w-4/5 rounded bg-line" />
      </div>
    </main>
  );
}

function RestrictedBusiness() {
  const { membership, notice, logout } = useAuth();
  const router = useRouter();
  const status = membership?.business.status;
  const inactiveMembership = membership && !membership.isActive;
  const copy = inactiveMembership
    ? {
        title: "Supplier membership is inactive",
        body: "This account no longer has active access to the supplier business. Contact the business owner or PartsArc operations.",
      }
    : status && status !== "ACTIVE"
      ? statusCopy[status]
      : {
          title: "No supplier business is assigned",
          body: "This supplier account does not have an active business membership. Ask an PartsArc administrator to review the account.",
        };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-line bg-surface p-8 shadow-sm max-[600px]:p-6">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-navy text-white">
          <HiOutlineBuildingStorefront className="size-6" />
        </div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">
          Supplier access
        </p>
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-ink">
          {copy.title}
        </h1>
        <p className="mt-3 leading-7 text-muted-text">{notice || copy.body}</p>
        {membership ? (
          <div className="mt-6 rounded-xl border border-line bg-canvas p-4 text-sm">
            <strong className="block text-ink">
              {membership.business.displayName}
            </strong>
            <span className="mt-1 block text-muted-text">
              Status: {membership.business.status.replaceAll("_", " ")}
            </span>
          </div>
        ) : null}
        <Button
          className="mt-6 gap-2"
          variant="outline"
          onClick={() => {
            void logout().finally(() => router.replace("/login"));
          }}
        >
          <HiOutlineArrowRightOnRectangle className="size-4" />
          Sign out
        </Button>
      </section>
    </main>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { ready, account, membership } = useAuth();
  const isPublicRoute = publicRoutes.has(pathname);

  useEffect(() => {
    if (ready && !account && !isPublicRoute) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
    if (
      ready &&
      account?.mustChangePassword &&
      pathname !== "/change-password"
    ) {
      router.replace("/change-password");
    }
  }, [account, isPublicRoute, pathname, ready, router]);

  if (isPublicRoute) return children;
  if (!ready || !account) return <FullPageLoading />;
  if (pathname === "/change-password") return children;
  if (account.mustChangePassword) return <FullPageLoading />;
  if (!membership?.isActive || membership.business.status !== "ACTIVE") {
    return <RestrictedBusiness />;
  }

  return (
    <div className="grid min-h-screen min-[1051px]:grid-cols-[246px_1fr]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 min-[1051px]:col-start-2">
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="mx-auto max-w-[1600px] p-[30px] max-[1050px]:p-[22px] max-[768px]:pb-24 max-[680px]:px-3.5 max-[680px]:pt-[18px]">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
