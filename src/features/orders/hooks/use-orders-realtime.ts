import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { parseOrder } from '@/features/orders/api/orders.api'
import { ordersQueryKeyRoot } from '@/features/orders/hooks/use-orders'
import { sellerOrdersHistoryQueryKey } from '@/features/seller/hooks/use-seller'
import { env } from '@/shared/config/env'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Order } from '@/features/orders/types/order.types'

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

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

/**
 * Kết nối STOMP `/user/queue/orders` — dùng chung cho buyer (Đơn mua) và seller.
 * Khi seller đổi fulfillmentStatus, buyer nhận cùng event và cập nhật UI ngay.
 */
export function useOrdersRealtime(enabled: boolean): RealtimeStatus {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const hasConnectedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !accessToken) {
      setStatus('disconnected')
      return
    }

    setStatus('connecting')
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

        client.subscribe('/user/queue/orders', (message) => {
          try {
            const event = JSON.parse(message.body) as OrderRealtimeEvent
            if (event.order != null) {
              updateOrderInState(queryClient, event.order)
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
      },
      onStompError: () => {
        setStatus('disconnected')
      },
    })

    client.activate()

    return () => {
      void client.deactivate()
      setStatus('disconnected')
    }
  }, [enabled, accessToken, queryClient])

  return status
}
