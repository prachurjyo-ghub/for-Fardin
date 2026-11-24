"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  HiBars3,
  HiChevronDown,
  HiMoon,
  HiOutlineBell,
  HiOutlineArrowRightOnRectangle,
  HiSun,
} from "react-icons/hi2"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchControl } from "@/components/shared/form-control"
import { useAuth } from "@/providers/auth-provider"
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/services/notifications"

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const { account, membership, logout } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    let active = true
    let inFlight = false
    let failures = 0
    let retryAfter = 0
    const load = async () => {
      if (
        document.visibilityState !== "visible" ||
        inFlight ||
        Date.now() < retryAfter
      ) return
      inFlight = true
      try {
        const page = await getNotifications()
        failures = 0
        retryAfter = 0
        if (active) {
          setNotifications(page.items)
          setUnread(page.unreadCount)
        }
      } catch {
        failures += 1
        const backoff = Math.min(300_000, 30_000 * 2 ** Math.min(failures, 4))
        retryAfter = Date.now() + backoff + Math.floor(Math.random() * 5_000)
      } finally {
        inFlight = false
      }
    }
    void load()
    const timer = window.setInterval(load, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  const isDark = (resolvedTheme ?? theme) === "dark"

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-[rgba(255,255,255,0.94)] px-7 backdrop-blur-[14px] max-[1050px]:px-[17px] max-[680px]:h-16 dark:bg-[rgba(13,33,52,0.92)]">
      <button
        type="button"
        className="relative hidden size-10 items-center justify-center rounded-[10px] border border-line bg-surface text-ink max-[1050px]:!inline-flex"
        aria-label="Open navigation"
        onClick={onMenuClick}
      >
        <HiBars3 className="size-5" />
      </button>

      <SearchControl
          className="h-10 w-[min(460px,42vw)] rounded-[10px] bg-canvas px-3.5 max-[1050px]:w-[min(420px,48vw)] max-[680px]:hidden"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              router.push(`/requests?q=${encodeURIComponent(query)}`)
            }
          }}
          placeholder="Search requests, part numbers or orders"
      />

      <div className="flex items-center gap-2.5 max-[420px]:gap-1.5">
        <button
          type="button"
          className="relative size-10 rounded-[10px] border border-line bg-surface text-ink"
          aria-label="Switch theme"
          title="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {mounted ? (
            isDark ? (
              <HiSun className="mx-auto size-5" />
            ) : (
              <HiMoon className="mx-auto size-5" />
            )
          ) : (
            <span className="mx-auto block size-5" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative size-10 rounded-[10px] border border-line bg-surface text-ink"
            aria-label={`${unread} unread notifications`}
          >
            <HiOutlineBell className="mx-auto size-5" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-blue px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(360px,92vw)] p-2">
            <div className="flex items-center justify-between px-2 py-2">
              <strong className="text-sm">Notifications</strong>
              {unread > 0 ? (
                <button
                  className="text-xs font-bold text-blue"
                  onClick={() => {
                    void markAllNotificationsRead().then(() => {
                      setUnread(0)
                      setNotifications((items) =>
                        items.map((item) => ({ ...item, isRead: true })),
                      )
                    })
                  }}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            {notifications.length ? (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="block cursor-pointer whitespace-normal px-3 py-2"
                  onClick={() => {
                    if (!item.isRead) {
                      void markNotificationRead(item.id)
                      setUnread((value) => Math.max(0, value - 1))
                      setNotifications((items) =>
                        items.map((value) =>
                          value.id === item.id
                            ? { ...value, isRead: true }
                            : value,
                        ),
                      )
                    }
                    if (item.entityType === "CONVERSATION")
                      router.push("/messages")
                    if (item.entityType === "ORDER") router.push("/orders")
                    if (item.entityType === "SUPPLIER_ASSIGNMENT")
                      router.push("/requests")
                    if (item.entityType === "SOURCING_REQUEST")
                      router.push("/requests")
                    if (["SUPPLIER_WALLET", "WALLET_TOP_UP", "COMMISSION_RESERVATION"].includes(item.entityType ?? ""))
                      router.push("/credit-wallet")
                  }}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${item.isRead ? "bg-line" : "bg-blue"}`}
                    />
                    <span>
                      <b className="block text-xs text-ink">{item.title}</b>
                      <span className="mt-1 block text-xs leading-5 text-muted-text">
                        {item.body}
                      </span>
                    </span>
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-3 py-5 text-center text-xs text-muted-text">
                No notifications yet.
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 border-0 bg-transparent px-1 py-1 text-ink outline-none">
            <span className="grid size-[34px] place-items-center rounded-full bg-navy text-[11px] font-bold text-white">
              {(account?.fullName ?? account?.email ?? "SU")
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span className="hidden flex-col text-left min-[681px]:flex">
              <strong className="text-xs">
                {account?.fullName ?? account?.email}
              </strong>
              <small className="text-[10px] text-muted-text">
                {membership?.business.displayName ?? "Supplier account"}
              </small>
            </span>
            <HiChevronDown className="hidden size-4 text-muted-text min-[681px]:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push("/account")}>
              Business & account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/listings")}>
              Manage listings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onClick={() => {
                void logout().finally(() => router.replace("/login"))
              }}
            >
              <HiOutlineArrowRightOnRectangle className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
