import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { parseOrder } from '@/features/orders/api/orders.api'
import { ordersQueryKeyRoot } from '@/features/orders/hooks/use-orders'
import {
  FULFILLMENT_LABELS,
  getOrderFulfillmentStatus,
} from '@/features/orders/lib/fulfillment'
import { useOrderNotificationsStore } from '@/features/orders/stores/order-notifications-store'
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

/**
 * Đẩy thông báo theo role:
 * - Buyer (đúng email đơn): cập nhật đơn mua
 * - Seller/Admin (không phải người mua của đơn): đơn mới / trạng thái giao
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

  const add = useOrderNotificationsStore.getState().add
  const eventType = (event.type ?? '').toUpperCase()
  const fulfillment = getOrderFulfillmentStatus(order)
  const statusLabel = fulfillment ? FULFILLMENT_LABELS[fulfillment] : order.status

  if (eventType.includes('CREATED')) {
    if (isBuyerOfOrder) {
      add({
        orderId: order.id,
        type: 'new-order',
        audience: 'buyer',
        message: `Đặt hàng thành công — đơn #${order.id}.`,
        href: `/account/orders/${order.id}`,
      })
    }
    if (sellerCapable && !isBuyerOfOrder) {
      add({
        orderId: order.id,
        type: 'new-order',
        audience: adminCapable ? 'admin' : 'seller',
        message: `Có đơn hàng mới #${order.id} cần xử lý.`,
        href: '/seller/orders',
      })
    }
    return
  }

  if (isBuyerOfOrder) {
    add({
      orderId: order.id,
      type: 'status-update',
      audience: 'buyer',
      message: `Đơn #${order.id} của bạn đã chuyển sang "${statusLabel}".`,
      href: `/account/orders/${order.id}`,
    })
  }

  if (sellerCapable && !isBuyerOfOrder) {
    add({
      orderId: order.id,
      type: 'status-update',
      audience: adminCapable ? 'admin' : 'seller',
      message: `Đơn #${order.id} cập nhật trạng thái: "${statusLabel}".`,
      href: '/seller/orders',
    })
  }
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
