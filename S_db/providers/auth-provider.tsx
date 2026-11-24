"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  errorMessage,
  login as apiLogin,
  logout as apiLogout,
  rejectCurrentSession,
  restoreSession,
  subscribeToSession,
  verifySupplierAccess,
  type SafeAccount,
  type SupplierMembership,
} from "@/lib/services/auth";

type AuthContextValue = {
  ready: boolean;
  account: SafeAccount | null;
  membership: SupplierMembership | null;
  notice: string;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function selectMembership(account: SafeAccount): SupplierMembership | null {
  return (
    account.supplierMemberships.find(
      (item) => item.isPrimary && item.isActive,
    ) ??
    account.supplierMemberships.find((item) => item.isActive) ??
    account.supplierMemberships[0] ??
    null
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<SafeAccount | null>(null);
  const [membership, setMembership] = useState<SupplierMembership | null>(null);
  const [notice, setNotice] = useState("");

  async function establish(next: SafeAccount) {
    if (next.role !== "SUPPLIER_OWNER" && next.role !== "SUPPLIER_STAFF") {
      await rejectCurrentSession();
      setNotice("Use a supplier owner or staff account for this portal.");
      return false;
    }
    const selected = selectMembership(next);
    setAccount(next);
    setMembership(selected);
    setNotice("");
    if (
      !next.mustChangePassword &&
      selected?.isActive &&
      selected.business.status === "ACTIVE"
    ) {
      await verifySupplierAccess(selected.business.id);
    }
    return true;
  }

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeToSession((value) => {
      if (!value) {
        setAccount(null);
        setMembership(null);
      } else if (
        value.account.role === "SUPPLIER_OWNER" ||
        value.account.role === "SUPPLIER_STAFF"
      ) {
        setAccount(value.account);
        setMembership(selectMembership(value.account));
      }
    });
    void (async () => {
      try {
        const restored = await restoreSession();
        if (restored) await establish(restored.account);
      } catch (error) {
        if (!cancelled) setNotice(errorMessage(error));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // Auth bootstrapping runs once; cross-tab changes arrive through the subscription.
  }, []);

  async function login(email: string, password: string) {
    try {
      const authenticated = await apiLogin({ email, password });
      const accepted = await establish(authenticated.account);
      return accepted
        ? null
        : "Use a supplier owner or staff account for this portal.";
    } catch (error) {
      const message = errorMessage(error);
      setNotice(message);
      return message;
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setAccount(null);
      setMembership(null);
      setNotice("");
    }
  }

  return (
    <AuthContext.Provider
      value={{ ready, account, membership, notice, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider");
  return value;
}
