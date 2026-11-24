export type Role =
  "CUSTOMER" | "SUPPLIER_OWNER" | "SUPPLIER_STAFF" | "ADMIN" | "SUPER_ADMIN";
export type Account = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  accountStatus: string;
};
export type Session = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  csrfToken: string;
  account: Account;
};
type Envelope<T> = { success: true; data: T; requestId: string };
type Failure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ path?: string; message?: string }>;
  };
  requestId?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details: Failure["error"]["details"] = [],
    readonly requestId?: string,
  ) {
    super(message);
  }
}

const BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");
const CLIENT = "admin";
const CSRF = `${process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "partsarc_csrf"}_${CLIENT}`;
const CHANNEL = "partsarc-admin-session";
const LOCK = "partsarc-admin-refresh";
let session: Session | null = null;
let refreshing: Promise<Session | null> | null = null;
const listeners = new Set<(session: Session | null) => void>();
let channel: BroadcastChannel | null = null;

function publish(value: Session | null, broadcast = true) {
  session = value;
  listeners.forEach((listener) => listener(value));
  if (broadcast && typeof BroadcastChannel !== "undefined") {
    channel ??= new BroadcastChannel(CHANNEL);
    channel.postMessage(
      value ? { type: "session", value } : { type: "logout" },
    );
  }
}

function initChannel() {
  if (typeof BroadcastChannel === "undefined" || channel) return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event) => {
    const message = event.data as { type?: string; value?: Session };
    if (message.type === "session" && message.value)
      publish(message.value, false);
    if (message.type === "logout") publish(null, false);
  };
}

function cookie(name: string) {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie
    .split("; ")
    .find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

async function parse<T>(response: Response): Promise<T> {
  let payload: Envelope<T> | Failure;
  try {
    payload = (await response.json()) as Envelope<T> | Failure;
  } catch {
    if ([429, 502, 503, 504].includes(response.status)) {
      throw new ApiError(
        "PartsArc is waking up after being idle. Please wait a moment and try again.",
        "SERVICE_WAKING",
        response.status,
      );
    }
    throw new ApiError(
      "The API returned an unreadable response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!response.ok || !payload.success) {
    const failure = payload as Failure;
    throw new ApiError(
      failure.error?.message ?? "Request failed.",
      failure.error?.code ?? "API_ERROR",
      response.status,
      failure.error?.details,
      failure.requestId,
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
    const health = await fetch(`${BASE}/health`, {
      headers: { accept: "application/json", "x-auth-client": CLIENT },
      credentials: "include",
    }).catch(() => null);
    if (health?.ok) return fetch(url, init);
  }
  return response;
}

async function raw<T>(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("x-auth-client", CLIENT);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  )
    headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetchWithRecovery(`${BASE}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("PartsArc API is unreachable.", "NETWORK_ERROR", 0);
  }
  return parse<T>(response);
}

async function locked<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request(LOCK, operation);
  const key = `${LOCK}:lease`,
    owner = crypto.randomUUID();
  for (;;) {
    const now = Date.now();
    type Lease = { owner: string; expiresAt: number };
    let lease: Lease | null = null;
    try {
      lease = JSON.parse(localStorage.getItem(key) ?? "null") as Lease | null;
    } catch {
      return operation();
    }
    if (!lease || lease.expiresAt < now) {
      localStorage.setItem(
        key,
        JSON.stringify({ owner, expiresAt: now + 5000 }),
      );
      const claimed = JSON.parse(
        localStorage.getItem(key) ?? "null",
      ) as Lease | null;
      if (claimed?.owner === owner) {
        try {
          return await operation();
        } finally {
          if (
            (JSON.parse(localStorage.getItem(key) ?? "null") as Lease | null)
              ?.owner === owner
          )
            localStorage.removeItem(key);
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

export function subscribe(listener: (value: Session | null) => void) {
  initChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refresh() {
  initChannel();
  if (refreshing) return refreshing;
  const previous = session?.accessToken;
  refreshing = locked(async () => {
    if (session?.accessToken && session.accessToken !== previous)
      return session;
    const csrf = cookie(CSRF);
    if (!csrf) {
      publish(null);
      return null;
    }
    try {
      const next = await raw<Session>("/auth/refresh", {
        method: "POST",
        headers: { "x-csrf-token": csrf },
      });
      publish(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        publish(null);
        return null;
      }
      throw error;
    }
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const active = session ?? (await refresh());
  if (!active)
    throw new ApiError(
      "Your admin session has ended.",
      "AUTHENTICATION_REQUIRED",
      401,
    );
  try {
    return await raw<T>(path, init, active.accessToken);
  } catch (error) {
    if (retry && error instanceof ApiError && error.status === 401) {
      const next = await refresh();
      if (next) return raw<T>(path, init, next.accessToken);
      publish(null);
    }
    throw error;
  }
}

export async function download(path: string) {
  const active = session ?? (await refresh());
  if (!active)
    throw new ApiError(
      "Your admin session has ended.",
      "AUTHENTICATION_REQUIRED",
      401,
    );
  const run = (token: string) =>
    fetch(`${BASE}${path}`, {
      headers: { authorization: `Bearer ${token}`, "x-auth-client": CLIENT },
      credentials: "include",
    });
  let response = await run(active.accessToken);
  if (response.status === 401) {
    const next = await refresh();
    if (next) response = await run(next.accessToken);
  }
  if (!response.ok)
    throw new ApiError("Download failed.", "DOWNLOAD_FAILED", response.status);
  return response.blob();
}

export async function login(email: string, password: string) {
  const next = await raw<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  publish(next);
  return next;
}
export async function logout() {
  const active = session;
  try {
    if (active)
      await raw("/auth/logout", { method: "POST" }, active.accessToken);
  } finally {
    publish(null);
  }
}
export const restore = refresh;
export const message = (error: unknown) =>
  error instanceof ApiError
    ? `${error.message}${error.requestId ? ` · Request ${error.requestId}` : ""}`
    : "Something went wrong.";
