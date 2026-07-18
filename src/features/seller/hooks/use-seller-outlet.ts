import { useOutletContext } from 'react-router-dom'
import type { RealtimeStatus } from '@/features/orders/hooks/use-orders-realtime'

export type SellerOutletContext = {
  realtimeStatus: RealtimeStatus
}

export function useSellerOutlet() {
  return useOutletContext<SellerOutletContext>()
}
