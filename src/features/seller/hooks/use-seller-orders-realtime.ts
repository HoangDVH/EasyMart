import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/shared/config/env'
import { useAuthStore } from '@/shared/stores/auth-store'
import { parseSellerOrder } from '@/features/seller/api/seller.api'
import { sellerOrdersHistoryQueryKey } from '@/features/seller/hooks/use-seller'
import type { Order } from '@/features/orders/types/order.types'

/** Theo spec backend: wss://javabackend-olfp.onrender.com/ws (override bằng VITE_WS_URL). */
function resolveBrokerUrl(): string {
  if (env.WS_URL) return env.WS_URL
  return `${env.API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/ws`
}

type OrderRealtimeEvent = {
  type?: string
  order?: unknown
}

/**
 * Cập nhật / thêm đơn trong cache React Query — tương đương `updateOrderInState(event.order)`.
 * event.type: ORDER_CREATED | ORDER_STATUS_CHANGED | FULFILLMENT_STATUS_CHANGED
 */
function updateOrderInState(
  queryClient: ReturnType<typeof useQueryClient>,
  rawOrder: unknown,
) {
  const order = parseSellerOrder(rawOrder)
  if (!order) {
    /** Payload lạ → refetch để không miss dữ liệu. */
    void queryClient.invalidateQueries({ queryKey: sellerOrdersHistoryQueryKey })
    return
  }

  queryClient.setQueryData<Order[]>(sellerOrdersHistoryQueryKey, (prev) => {
    const list = prev ?? []
    const idx = list.findIndex((item) => item.id === order.id)
    if (idx === -1) return [order, ...list]
    const next = [...list]
    next[idx] = order
    return next
  })
}

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

/**
 * Kết nối STOMP theo spec:
 * - brokerURL wss://…/ws
 * - subscribe `/user/queue/orders`
 * - parse JSON → updateOrderInState(event.order)
 * - reconnect → refetch /seller/history để đồng bộ
 */
export function useSellerOrdersRealtime(enabled: boolean): RealtimeStatus {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const hasConnectedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !accessToken) {
      setStatus('disconnected')
      return
    }

    const resyncHistory = () => {
      void queryClient.invalidateQueries({ queryKey: sellerOrdersHistoryQueryKey })
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
            // event.type: ORDER_CREATED | ORDER_STATUS_CHANGED | FULFILLMENT_STATUS_CHANGED
            if (event.order != null) {
              updateOrderInState(queryClient, event.order)
            } else {
              resyncHistory()
            }
          } catch {
            resyncHistory()
          }
        })

        if (hasConnectedRef.current) {
          resyncHistory()
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
