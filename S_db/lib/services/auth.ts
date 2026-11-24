export type SupplierBusinessStatus =
  "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export type SafeAccount = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role:
    "CUSTOMER" | "SUPPLIER_OWNER" | "SUPPLIER_STAFF" | "ADMIN" | "SUPER_ADMIN";
  accountStatus: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  mustChangePassword: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  customerProfile: unknown | null;
  supplierMemberships: SupplierMembership[];
};

export type SupplierMembership = {
  id: string;
  title: string | null;
  isPrimary: boolean;
  isActive: boolean;
  business: {
    id: string;
    businessCode: string | null;
    displayName: string;
    status: SupplierBusinessStatus;
    subscriptionGraceEndsAt: string | null;
    entitlementEndsAt: string | null;
    entitlementSource: "SUBSCRIPTION" | "MIGRATION_GRACE" | null;
  };
};

export type AuthSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  csrfToken: string;
  account: SafeAccount;
};

type ApiSuccess<T> = { success: true; data: T; requestId: string };
type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<{ path?: string; message?: string }>;
  };
  requestId: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details: ApiFailure["error"]["details"] = [],
    readonly requestId?: string,
    readonly kind:
      | "network"
      | "authentication"
      | "permission"
      | "validation"
      | "api" = "api",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");
const AUTH_CLIENT = "supplier";
const CSRF_COOKIE = `${process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "partsarc_csrf"}_${AUTH_CLIENT}`;
const CHANNEL_NAME = "partsarc-supplier-session";
const LOCK_NAME = "partsarc-supplier-refresh";

let session: AuthSession | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;
const listeners = new Set<(value: AuthSession | null) => void>();
let channel: BroadcastChannel | null = null;

function broadcast(value: AuthSession | null) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: value ? "session" : "logout", session: value });
}

function publish(value: AuthSession | null, notifyOtherTabs = true) {
  session = value;
  listeners.forEach((listener) => listener(value));
  if (notifyOtherTabs) broadcast(value);
}

function ensureChannel() {
  if (
    typeof window === "undefined" ||
    !("BroadcastChannel" in window) ||
    channel
  )
    return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    const message = event.data as { type?: string; session?: AuthSession };
    if (message.type === "session" && message.session)
      publish(message.session, false);
    if (message.type === "logout") publish(null, false);
  };
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie
    .split("; ")
    .find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: ApiSuccess<T> | ApiFailure;
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    if ([429, 502, 503, 504].includes(response.status)) {
      throw new ApiError(
        "PartsArc is waking up after being idle. Please wait a moment and try again.",
        "SERVICE_WAKING",
        response.status,
        [],
        undefined,
        "network",
      );
    }
    throw new ApiError(
      "The server returned an unreadable response.",
      "INVALID_API_RESPONSE",
      response.status,
    );
  }
  if (!response.ok || !payload.success) {
    const failure = payload as ApiFailure;
    const kind =
      response.status === 401
        ? "authentication"
        : response.status === 403
          ? "permission"
          : response.status === 400 || response.status === 409
            ? "validation"
            : "api";
    throw new ApiError(
      failure.error?.message ?? "The request could not be completed.",
      failure.error?.code ?? "API_ERROR",
      response.status,
      failure.error?.details ?? [],
      failure.requestId,
      kind,
    );
  }
  return payload.data;
}

async function fetchWithRecovery(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  if (
    ![429, 502, 503, 504].includes(response.status) ||
    !response.headers.has("x-render-routing")
  )
    return response;
  for (const delay of [1500, 3000, 5000, 8000, 8000]) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const health = await fetch(`${API_BASE}/health`, {
      headers: { accept: "application/json", "x-auth-client": AUTH_CLIENT },
      credentials: "include",
    }).catch(() => null);
    if (health?.ok) return fetch(url, init);
  }
  return response;
}

async function rawRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-auth-client", AUTH_CLIENT);
  if (init.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetchWithRecovery(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Unable to reach PartsArc. Check your connection and try again.",
      "NETWORK_ERROR",
      0,
      [],
      undefined,
      "network",
    );
  }
  return parseResponse<T>(response);
}

async function withFallbackLock<T>(operation: () => Promise<T>): Promise<T> {
  type Lease = { owner: string; expiresAt: number };
  const key = `${LOCK_NAME}-lease`;
  const owner = crypto.randomUUID();
  for (;;) {
    let current: Lease | null = null;
    try {
      current = JSON.parse(localStorage.getItem(key) ?? "null") as Lease | null;
    } catch {
      return operation();
    }
    if (!current || current.expiresAt < Date.now()) {
      let claimed: Lease | null;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ owner, expiresAt: Date.now() + 5000 }),
        );
        claimed = JSON.parse(
          localStorage.getItem(key) ?? "null",
        ) as Lease | null;
      } catch {
        return operation();
      }
      if (claimed?.owner === owner) {
        try {
          return await operation();
        } finally {
          const latest = JSON.parse(
            localStorage.getItem(key) ?? "null",
          ) as Lease | null;
          if (latest?.owner === owner) localStorage.removeItem(key);
        }
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 75));
  }
}

async function withRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, operation);
  }
  return withFallbackLock(operation);
}

export function subscribeToSession(
  listener: (value: AuthSession | null) => void,
) {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshSession(): Promise<AuthSession | null> {
  ensureChannel();
  if (refreshPromise) return refreshPromise;
  const previousToken = session?.accessToken;
  refreshPromise = withRefreshLock(async () => {
    if (session?.accessToken && session.accessToken !== previousToken)
      return session;
    const csrfToken = readCookie(CSRF_COOKIE);
    if (!csrfToken) {
      publish(null);
      return null;
    }
    try {
      const next = await rawRequest<AuthSession>("/auth/refresh", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      publish(next);
      return next;
    } catch (error) {
      publish(null);
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        return null;
      throw error;
    }
  }).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export function restoreSession() {
  return refreshSession();
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const active = session ?? (await refreshSession());
  if (!active)
    throw new ApiError(
      "Your session has ended. Please sign in again.",
      "AUTHENTICATION_REQUIRED",
      401,
      [],
      undefined,
      "authentication",
    );
  try {
    return await rawRequest<T>(path, init, active.accessToken);
  } catch (error) {
    if (retry && error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshSession();
      if (refreshed) return rawRequest<T>(path, init, refreshed.accessToken);
      publish(null);
    }
    throw error;
  }
}

export async function apiFileRequest(path: string, init: RequestInit = {}) {
  const active = session ?? (await refreshSession());
  if (!active)
    throw new ApiError(
      "Your session has ended. Please sign in again.",
      "AUTHENTICATION_REQUIRED",
      401,
    );
  const request = async (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    headers.set("x-auth-client", AUTH_CLIENT);
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  };
  let response = await request(active.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) response = await request(refreshed.accessToken);
  }
  if (!response.ok)
    throw new ApiError(
      "The attachment could not be loaded.",
      "ATTACHMENT_ERROR",
      response.status,
    );
  return response;
}

export async function login(input: { email: string; password: string }) {
  const next = await rawRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  publish(next);
  return next;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const account = await apiRequest<SafeAccount>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (session) publish({ ...session, account });
  return account;
}

export async function logout() {
  const active = session;
  try {
    if (active)
      await rawRequest<{ message: string }>(
        "/auth/logout",
        { method: "POST" },
        active.accessToken,
      );
  } finally {
    publish(null);
  }
}

export async function rejectCurrentSession() {
  await logout();
}

export function acceptInvitation(input: {
  token: string;
  fullName: string;
  password: string;
}) {
  return rawRequest<{
    message: string;
    userId: string;
    businessId: string;
  }>("/supplier-invitations/accept", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifySupplierAccess(businessId: string) {
  return apiRequest<{
    granted: true;
    supplierAccess: {
      membershipId: string;
      businessId: string;
      businessStatus: SupplierBusinessStatus;
    };
  }>("/auth/access/supplier", {
    headers: { "x-business-id": businessId },
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "ACCOUNT_RESTRICTED")
      return "This account is suspended or disabled. Contact PartsArc operations.";
    if (error.code === "FORBIDDEN")
      return "This account cannot access the supplier portal.";
    if (error.code === "INVALID_SUPPLIER_INVITATION")
      return "This invitation is invalid, expired, used, or revoked.";
    if (error.code === "SUPPLIER_SUBSCRIPTION_REQUIRED")
      return "This supplier subscription is expired or inactive. Contact PartsArc operations to renew access.";
    if (error.code === "SUPPLIER_BUSINESS_SUSPENDED")
      return "This supplier business is suspended. Contact PartsArc operations for review.";
    if (error.code === "PASSWORD_CHANGE_REQUIRED")
      return "Change the temporary password before using supplier operations.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
