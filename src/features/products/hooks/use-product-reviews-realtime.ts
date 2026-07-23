import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { reviewsQueryKeyRoot } from '@/features/products/hooks/use-reviews'
import { handleReviewRealtimeEvent } from '@/features/products/lib/review-realtime'
import { sharedStompSession } from '@/shared/lib/stomp-session'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { ProductReviewRealtimeEvent } from '@/features/products/types/review.types'

/**
 * Subscribe `/topic/product-reviews/{productId}` khi đã login (cùng kết nối STOMP orders).
 * Guest chỉ dùng REST; F5/reconnect → refetch list.
 */
export function useProductReviewsRealtime(productId: string | null, enabled = true) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!enabled || !productId || !accessToken) return

    let seenConnected = false
    sharedStompSession.retain(accessToken)
    const off = sharedStompSession.subscribe(`/topic/product-reviews/${productId}`, (body) => {
      try {
        const event = JSON.parse(body) as ProductReviewRealtimeEvent
        handleReviewRealtimeEvent(queryClient, event)
      } catch {
        void queryClient.invalidateQueries({ queryKey: [...reviewsQueryKeyRoot, productId] })
      }
    })

    const offStatus = sharedStompSession.onStatus((status) => {
      if (status !== 'connected') return
      if (seenConnected) {
        void queryClient.invalidateQueries({ queryKey: [...reviewsQueryKeyRoot, productId] })
      }
      seenConnected = true
    })

    return () => {
      off()
      offStatus()
      sharedStompSession.release()
    }
  }, [enabled, productId, accessToken, queryClient])
}
