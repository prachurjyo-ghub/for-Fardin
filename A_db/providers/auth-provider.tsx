"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  login as apiLogin,
  logout as apiLogout,
  message,
  restore,
  subscribe,
  type Account,
} from "@/lib/api";
import { SessionSkeleton } from "@/components/skeletons";

type Value = {
  ready: boolean;
  account: Account | null;
  notice: string;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export const canUseAdminPortal = (account: Pick<Account, "role">) =>
  account.role === "ADMIN" || account.role === "SUPER_ADMIN";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [account, setAccount] = useState<Account | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribe((value) => {
      if (active)
        setAccount(
          value && canUseAdminPortal(value.account) ? value.account : null,
        );
    });
    void restore()
      .then((value) => {
        if (active)
          setAccount(
            value && canUseAdminPortal(value.account) ? value.account : null,
          );
      })
      .catch((error) => active && setNotice(message(error)))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  async function login(email: string, password: string) {
    try {
      const value = await apiLogin(email, password);
      if (!canUseAdminPortal(value.account)) {
        await apiLogout();
        setNotice("Use an ADMIN or SUPER_ADMIN account.");
        return false;
      }
      setAccount(value.account);
      setNotice("");
      return true;
    } catch (error) {
      setNotice(message(error));
      return false;
    }
  }
  async function logout() {
    await apiLogout();
    setAccount(null);
  }
  return (
    <Context.Provider value={{ ready, account, notice, login, logout }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { ready, account } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (ready && !account)
      router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [ready, account, router, path]);
  if (!ready || !account) return <SessionSkeleton />;
  return children;
}
