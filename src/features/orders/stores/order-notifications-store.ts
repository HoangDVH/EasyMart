import { create } from 'zustand'

/** Ai được xem thông báo này trên chuông navbar. */
export type NotificationAudience = 'buyer' | 'seller' | 'admin'

export type OrderNotificationType = 'new-order' | 'status-update'

export type OrderNotificationProduct = {
  productId: string
  name: string
  imageUrl: string | null
  unitPrice: number
  quantity: number
}

export type OrderNotification = {
  id: string
  orderId: string
  type: OrderNotificationType
  audience: NotificationAudience
  message: string
  products: OrderNotificationProduct[]
  /** Đường dẫn khi bấm vào thông báo. */
  href: string
  createdAt: string
  read: boolean
}

const MAX_NOTIFICATIONS = 40
/** Chống trùng CREATED lặp / STATUS đi kèm lúc vừa tạo đơn (burst vài giây). */
export const ORDER_NOTIFY_DEDUPE_MS = 15_000

type OrderNotificationsState = {
  notifications: OrderNotification[]
  add: (
    notification: Pick<
      OrderNotification,
      'orderId' | 'type' | 'audience' | 'message' | 'href' | 'products'
    >,
  ) => void
  /**
   * Thêm thông báo nếu chưa có cùng orderId + type + audience trong cửa sổ dedupe.
   * Trả về true nếu đã thêm.
   */
  addUnique: (
    notification: Pick<
      OrderNotification,
      'orderId' | 'type' | 'audience' | 'message' | 'href' | 'products'
    >,
    withinMs?: number,
  ) => boolean
  /** Có thông báo cùng orderId (+ type tùy chọn) trong cửa sổ gần đây không. */
  hasRecent: (
    orderId: string,
    options?: { type?: OrderNotificationType; audience?: NotificationAudience; withinMs?: number },
  ) => boolean
  /** Xóa status-update vừa tới của cùng đơn (khi CREATED đến sau STATUS khởi tạo). */
  dropRecentStatusUpdates: (orderId: string, withinMs?: number) => void
  /** Bổ sung ảnh/chi tiết sản phẩm sau khi API product trả về. */
  updateProducts: (orderId: string, products: OrderNotificationProduct[]) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clear: () => void
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Thông báo đơn hàng realtime (in-memory) — dùng chung mọi role trên navbar. */
export const useOrderNotificationsStore = create<OrderNotificationsState>((set, get) => ({
  notifications: [],
  add: (notification) => {
    get().addUnique(notification)
  },
  addUnique: (notification, withinMs = ORDER_NOTIFY_DEDUPE_MS) => {
    if (
      get().hasRecent(notification.orderId, {
        type: notification.type,
        audience: notification.audience,
        withinMs,
      })
    ) {
      return false
    }
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
    }))
    return true
  },
  hasRecent: (orderId, options) => {
    const withinMs = options?.withinMs ?? ORDER_NOTIFY_DEDUPE_MS
    const cutoff = Date.now() - withinMs
    return get().notifications.some((item) => {
      if (item.orderId !== orderId) return false
      if (new Date(item.createdAt).getTime() < cutoff) return false
      if (options?.type && item.type !== options.type) return false
      if (options?.audience && item.audience !== options.audience) return false
      return true
    })
  },
  dropRecentStatusUpdates: (orderId, withinMs = ORDER_NOTIFY_DEDUPE_MS) => {
    const cutoff = Date.now() - withinMs
    set((state) => ({
      notifications: state.notifications.filter((item) => {
        if (item.orderId !== orderId) return true
        if (item.type !== 'status-update') return true
        return new Date(item.createdAt).getTime() < cutoff
      }),
    }))
  },
  updateProducts: (orderId, products) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.orderId === orderId ? { ...item, products } : item,
      ),
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
