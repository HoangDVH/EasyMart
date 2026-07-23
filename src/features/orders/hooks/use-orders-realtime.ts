import { useEffect, useRef, useState } from 'react'
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
import { handleReviewRealtimeEvent } from '@/features/products/lib/review-realtime'
import { reviewsQueryKeyRoot } from '@/features/products/hooks/use-reviews'
import { sellerOrdersHistoryQueryKey } from '@/features/seller/hooks/use-seller'
import { sharedStompSession } from '@/shared/lib/stomp-session'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Order } from '@/features/orders/types/order.types'
import type { ProductReviewRealtimeEvent } from '@/features/products/types/review.types'

export type { RealtimeStatus }

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
  /** Đơn có sản phẩm của seller đang login (kể cả khi seller tự mua để test). */
  const sellsThisOrder =
    Boolean(email) &&
    order.items.some(
      (item) =>
        Boolean(item.sellerEmail) && item.sellerEmail!.trim().toLowerCase() === email,
    )
  const sellerCapable = hasSellerCapability(roles, role)
  const adminCapable = isAdmin(roles, role)
  /** Seller/admin nhận tin khi bán SP trong đơn; admin luôn nhận nếu có quyền. */
  const shouldNotifySeller =
    (adminCapable && sellerCapable) ||
    (sellerCapable && (sellsThisOrder || !isBuyerOfOrder))

  const store = useOrderNotificationsStore.getState()
  const eventType = (event.type ?? '').toUpperCase()
  const fulfillment = getOrderFulfillmentStatus(order)
  const statusLabel = fulfillment ? FULFILLMENT_LABELS[fulfillment] : order.status
  const isCreatedEvent = eventType.includes('CREATED')
  const isFulfillmentEvent = eventType.includes('FULFILLMENT')
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
    if (shouldNotifySeller) {
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

  /**
   * Chỉ bỏ qua FULFILLMENT khởi tạo (AWAITING) — tránh báo trùng với CREATED.
   * Không nuốt ORDER_STATUS_CHANGED (vd. PAID sau COD/VNPay) dù fulfillment vẫn AWAITING.
   */
  if (isFulfillmentEvent && fulfillment === 'AWAITING_CONFIRMATION') return

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

  if (shouldNotifySeller) {
    const paidNow =
      eventType.includes('STATUS') && order.status.toUpperCase().includes('PAID')
    store.addUnique({
      orderId: order.id,
      type: 'status-update',
      audience: adminCapable ? 'admin' : 'seller',
      message: paidNow
        ? `Đơn #${order.id} đã thanh toán — cần xử lý giao hàng.`
        : `Đơn #${order.id} cập nhật trạng thái: "${statusLabel}".`,
      href: `/seller/orders/${order.id}`,
      products,
    })
  }
  void enrichNotificationProducts(order)
}

/**
 * Kết nối STOMP dùng chung — `/user/queue/orders` + `/user/queue/reviews`.
 * Gọi 1 lần ở AppLayout / DashboardLayout khi đã đăng nhập.
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

    sharedStompSession.retain(accessToken)
    const offStatus = sharedStompSession.onStatus((next) => {
      setStatus(next)
      setSharedStatus(next)
      if (next === 'connected') {
        if (hasConnectedRef.current) {
          resyncOrders(queryClient)
          void queryClient.invalidateQueries({ queryKey: reviewsQueryKeyRoot })
        }
        hasConnectedRef.current = true
      }
    })

    const offOrders = sharedStompSession.subscribe('/user/queue/orders', (body) => {
      try {
        const event = JSON.parse(body) as OrderRealtimeEvent
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

    const offReviews = sharedStompSession.subscribe('/user/queue/reviews', (body) => {
      try {
        const event = JSON.parse(body) as ProductReviewRealtimeEvent
        handleReviewRealtimeEvent(queryClient, event, { toast: true })
      } catch {
        void queryClient.invalidateQueries({ queryKey: reviewsQueryKeyRoot })
      }
    })

    return () => {
      offOrders()
      offReviews()
      offStatus()
      sharedStompSession.release()
      setStatus('disconnected')
      setSharedStatus('disconnected')
    }
  }, [enabled, accessToken, queryClient, setSharedStatus])

  return status
}
