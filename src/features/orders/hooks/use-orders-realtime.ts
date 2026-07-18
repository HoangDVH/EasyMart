import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { parseOrder } from '@/features/orders/api/orders.api'
import { productsApi } from '@/features/products/api/products.api'
import { ordersQueryKeyRoot } from '@/features/orders/hooks/use-orders'
import {
  FULFILLMENT_LABELS,
  getOrderFulfillmentStatus,
} from '@/features/orders/lib/fulfillment'
import {
  useOrderNotificationsStore,
  type OrderNotificationProduct,
} from '@/features/orders/stores/order-notifications-store'
import {
  useOrdersRealtimeStore,
  type RealtimeStatus,
} from '@/features/orders/stores/orders-realtime-store'
import { sellerOrdersHistoryQueryKey } from '@/features/seller/hooks/use-seller'
import { env } from '@/shared/config/env'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Order } from '@/features/orders/types/order.types'

export type { RealtimeStatus }

/** Theo spec backend: wss://…/ws (override bằng VITE_WS_URL). */
function resolveBrokerUrl(): string {
  if (env.WS_URL) return env.WS_URL
  return `${env.API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws`
}

type OrderRealtimeEvent = {
  type?: string
  order?: unknown
}

const myOrdersQueryKey = [...ordersQueryKeyRoot, 'mine'] as const

function hasSellerCapability(roles: string[] | undefined, role: string | undefined): boolean {
  const normalized = [...(roles ?? []), role ?? ''].map((item) => item.replace(/^ROLE_/i, '').toUpperCase())
  return normalized.includes('SELLER') || normalized.includes('ADMIN')
}

function isAdmin(roles: string[] | undefined, role: string | undefined): boolean {
  const normalized = [...(roles ?? []), role ?? ''].map((item) => item.replace(/^ROLE_/i, '').toUpperCase())
  return normalized.includes('ADMIN')
}

/**
 * Cập nhật cache buyer + seller khi nhận event.order qua STOMP.
 * event.type: ORDER_CREATED | ORDER_STATUS_CHANGED | FULFILLMENT_STATUS_CHANGED
 */
function updateOrderInState(
  queryClient: ReturnType<typeof useQueryClient>,
  rawOrder: unknown,
) {
  const order = parseOrder(rawOrder)
  if (!order) {
    void queryClient.invalidateQueries({ queryKey: ordersQueryKeyRoot })
    void queryClient.invalidateQueries({ queryKey: sellerOrdersHistoryQueryKey })
    return
  }

  queryClient.setQueryData<Order[]>(myOrdersQueryKey, (prev) => {
    if (!prev) return prev
    const idx = prev.findIndex((item) => item.id === order.id)
    if (idx === -1) return [order, ...prev]
    const next = [...prev]
    next[idx] = order
    return next
  })

  queryClient.setQueryData<Order>([...ordersQueryKeyRoot, 'detail', order.id], order)

  queryClient.setQueryData<Order[]>(sellerOrdersHistoryQueryKey, (prev) => {
    if (!prev) return prev
    const idx = prev.findIndex((item) => item.id === order.id)
    if (idx === -1) return [order, ...prev]
    const next = [...prev]
    next[idx] = order
    return next
  })
}

function resyncOrders(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ordersQueryKeyRoot })
  void queryClient.invalidateQueries({ queryKey: sellerOrdersHistoryQueryKey })
}

function orderProductSnapshots(order: Order): OrderNotificationProduct[] {
  return order.items.map((item) => ({
    productId: item.productId,
    name: item.productName || `Sản phẩm #${item.productId}`,
    imageUrl: null,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
  }))
}

async function enrichNotificationProducts(order: Order) {
  const products = await Promise.all(
    order.items.map(async (item): Promise<OrderNotificationProduct> => {
      try {
        const product = await productsApi.getById(item.productId)
        return {
          productId: item.productId,
          name: product.name || item.productName || `Sản phẩm #${item.productId}`,
          imageUrl: product.images?.[0] ?? product.imageUrl ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        }
      } catch {
        return {
          productId: item.productId,
          name: item.productName || `Sản phẩm #${item.productId}`,
          imageUrl: null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        }
      }
    }),
  )
  useOrderNotificationsStore.getState().updateProducts(order.id, products)
}

/**
 * Đẩy thông báo theo role (buyer / seller / admin) — cùng một quy tắc chống trùng:
 * Backend thường bắn 2–3 event khi tạo đơn (CREATED + FULFILLMENT khởi tạo + đôi khi STATUS).
 * Chỉ giữ 1 tin "đơn mới / đặt hàng thành công"; các bước trạng thái thật sau đó vẫn báo.
 */
function notifyOrderEvent(event: OrderRealtimeEvent, rawOrder: unknown) {
  const order = parseOrder(rawOrder)
  if (!order) return

  const auth = useAuthStore.getState()
  const email = (auth.user?.email ?? '').trim().toLowerCase()
  const roles = auth.user?.roles
  const role = auth.user?.role
  const isBuyerOfOrder =
    Boolean(email) && Boolean(order.userEmail) && order.userEmail.trim().toLowerCase() === email
  const sellerCapable = hasSellerCapability(roles, role)
  const adminCapable = isAdmin(roles, role)

  const store = useOrderNotificationsStore.getState()
  const eventType = (event.type ?? '').toUpperCase()
  const fulfillment = getOrderFulfillmentStatus(order)
  const statusLabel = fulfillment ? FULFILLMENT_LABELS[fulfillment] : order.status
  const isCreatedEvent = eventType.includes('CREATED')
  const products = orderProductSnapshots(order)

  if (isCreatedEvent) {
    /** CREATED đến sau STATUS → bỏ tin trạng thái vừa gắn với cùng đơn. */
    store.dropRecentStatusUpdates(order.id)

    if (isBuyerOfOrder) {
      store.addUnique({
        orderId: order.id,
        type: 'new-order',
        audience: 'buyer',
        message: `Đặt hàng thành công — đơn #${order.id}.`,
        href: `/account/orders/${order.id}`,
        products,
      })
    }
    if (sellerCapable && !isBuyerOfOrder) {
      store.addUnique({
        orderId: order.id,
        type: 'new-order',
        audience: adminCapable ? 'admin' : 'seller',
        message: `Có đơn hàng mới #${order.id} cần xử lý.`,
        href: `/seller/orders/${order.id}`,
        products,
      })
    }
    void enrichNotificationProducts(order)
    return
  }

  /** Trạng thái khởi tạo (= vừa tạo đơn) — không báo lần 2 cho mọi role. */
  if (fulfillment === 'AWAITING_CONFIRMATION') return

  /**
   * Vừa có tin "đơn mới / đặt hàng thành công" rồi thì bỏ qua các STATUS đi kèm
   * trong cửa sổ dedupe (áp dụng buyer + seller + admin).
   */
  if (store.hasRecent(order.id, { type: 'new-order' })) return

  if (isBuyerOfOrder) {
    store.addUnique({
      orderId: order.id,
      type: 'status-update',
      audience: 'buyer',
      message: `Đơn #${order.id} của bạn đã chuyển sang "${statusLabel}".`,
      href: `/account/orders/${order.id}`,
      products,
    })
  }

  if (sellerCapable && !isBuyerOfOrder) {
    store.addUnique({
      orderId: order.id,
      type: 'status-update',
      audience: adminCapable ? 'admin' : 'seller',
      message: `Đơn #${order.id} cập nhật trạng thái: "${statusLabel}".`,
      href: `/seller/orders/${order.id}`,
      products,
    })
  }
  void enrichNotificationProducts(order)
}

/**
 * Kết nối STOMP `/user/queue/orders` — gọi 1 lần ở AppLayout khi đã đăng nhập.
 * Buyer / Seller / Admin đều nhận event trên queue của mình; nội dung chuông phân theo role.
 */
export function useOrdersRealtime(enabled: boolean): RealtimeStatus {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const setSharedStatus = useOrdersRealtimeStore((state) => state.setStatus)
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const hasConnectedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !accessToken) {
      setStatus('disconnected')
      setSharedStatus('disconnected')
      return
    }

    setStatus('connecting')
    setSharedStatus('connecting')
    const client = new Client({
      brokerURL: resolveBrokerUrl(),
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setStatus('connected')
        setSharedStatus('connected')

        client.subscribe('/user/queue/orders', (message) => {
          try {
            const event = JSON.parse(message.body) as OrderRealtimeEvent
            if (event.order != null) {
              updateOrderInState(queryClient, event.order)
              notifyOrderEvent(event, event.order)
            } else {
              resyncOrders(queryClient)
            }
          } catch {
            resyncOrders(queryClient)
          }
        })

        if (hasConnectedRef.current) {
          resyncOrders(queryClient)
        }
        hasConnectedRef.current = true
      },
      onWebSocketClose: () => {
        setStatus('disconnected')
        setSharedStatus('disconnected')
      },
      onStompError: () => {
        setStatus('disconnected')
        setSharedStatus('disconnected')
      },
    })

    client.activate()

    return () => {
      void client.deactivate()
      setStatus('disconnected')
      setSharedStatus('disconnected')
    }
  }, [enabled, accessToken, queryClient, setSharedStatus])

  return status
}
