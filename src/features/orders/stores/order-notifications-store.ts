import { create } from 'zustand'

/** Ai được xem thông báo này trên chuông navbar. */
export type NotificationAudience = 'buyer' | 'seller' | 'admin'

export type OrderNotificationType = 'new-order' | 'status-update'

export type OrderNotification = {
  id: string
  orderId: string
  type: OrderNotificationType
  audience: NotificationAudience
  message: string
  /** Đường dẫn khi bấm vào thông báo. */
  href: string
  createdAt: string
  read: boolean
}

const MAX_NOTIFICATIONS = 40

type OrderNotificationsState = {
  notifications: OrderNotification[]
  add: (
    notification: Pick<OrderNotification, 'orderId' | 'type' | 'audience' | 'message' | 'href'>,
  ) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clear: () => void
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Thông báo đơn hàng realtime (in-memory) — dùng chung mọi role trên navbar. */
export const useOrderNotificationsStore = create<OrderNotificationsState>((set) => ({
  notifications: [],
  add: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: makeId(),
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ].slice(0, MAX_NOTIFICATIONS),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true })),
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),
  clear: () => set({ notifications: [] }),
}))
