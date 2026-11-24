import { apiRequest } from "@/lib/services/auth"

export type NotificationItem = {
  id: string
  title: string
  body: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export function getNotifications() {
  return apiRequest<{
    items: NotificationItem[]
    total: number
    unreadCount: number
  }>("/communications/notifications?pageSize=10")
}

export function markNotificationRead(id: string) {
  return apiRequest(`/communications/notifications/${id}/read`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export function markAllNotificationsRead() {
  return apiRequest("/communications/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  })
}
