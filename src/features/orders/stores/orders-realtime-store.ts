import { create } from 'zustand'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

type OrdersRealtimeState = {
  status: RealtimeStatus
  setStatus: (status: RealtimeStatus) => void
}

/** Trạng thái STOMP dùng chung (navbar + seller layout) — tránh mở nhiều kết nối. */
export const useOrdersRealtimeStore = create<OrdersRealtimeState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}))
