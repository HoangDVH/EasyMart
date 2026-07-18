import type { Order } from '@/features/orders/types/order.types'

/** Thứ tự chuyển trạng thái bắt buộc — chỉ được đi tuần tự từng bước. */
export const FULFILLMENT_FLOW = [
  'AWAITING_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
] as const

export type FulfillmentStatus = (typeof FULFILLMENT_FLOW)[number]

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  AWAITING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
}

/** Nhãn hành động trên nút = trạng thái đích. */
export const FULFILLMENT_ACTION_LABELS: Record<FulfillmentStatus, string> = {
  AWAITING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Xác nhận đơn',
  PROCESSING: 'Chuẩn bị hàng',
  SHIPPED: 'Giao cho vận chuyển',
  DELIVERED: 'Đã giao thành công',
}

export const FULFILLMENT_BADGE_CLASSES: Record<FulfillmentStatus, string> = {
  AWAITING_CONFIRMATION: 'bg-amber-100 text-amber-800 border-amber-300/60',
  CONFIRMED: 'bg-sky-100 text-sky-800 border-sky-300/60',
  PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-300/60',
  SHIPPED: 'bg-blue-100 text-blue-800 border-blue-300/60',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-300/60',
}

export function isFulfillmentStatus(value: string | null | undefined): value is FulfillmentStatus {
  return typeof value === 'string' && (FULFILLMENT_FLOW as readonly string[]).includes(value)
}

/** Trạng thái giao hàng của đơn — theo spec nằm ở items[0].fulfillmentStatus. */
export function getOrderFulfillmentStatus(order: Order): FulfillmentStatus | null {
  const raw = order.items[0]?.fulfillmentStatus ?? null
  return isFulfillmentStatus(raw) ? raw : null
}

export function getNextFulfillmentStatus(current: FulfillmentStatus): FulfillmentStatus | null {
  const idx = FULFILLMENT_FLOW.indexOf(current)
  if (idx < 0 || idx >= FULFILLMENT_FLOW.length - 1) return null
  return FULFILLMENT_FLOW[idx + 1]
}

/** Chỉ đơn đã thanh toán mới được seller cập nhật trạng thái. */
export function isOrderPaid(order: Order): boolean {
  return order.status === 'PAID'
}
