import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { productsApi } from '@/features/products/api/products.api'
import { useCartStore } from '@/shared/stores/cart-store'

export function useSyncCart(productIds: string[]) {
  const syncFromProducts = useCartStore((state) => state.syncFromProducts)
  const idsKey = useMemo(() => [...new Set(productIds.filter(Boolean))].sort().join(','), [productIds])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const ids = idsKey.length > 0 ? idsKey.split(',') : []
    if (ids.length === 0) {
      setIsSyncing(false)
      return
    }

    let cancelled = false
    setIsSyncing(true)

    void (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const product = await productsApi.getById(id)
            return [id, product] as const
          } catch {
            return [id, null] as const
          }
        }),
      )

      if (cancelled) return

      const removed = syncFromProducts(new Map(entries))
      if (removed.length > 0) {
        toast.info('Đã cập nhật giỏ hàng: một số sản phẩm không còn tồn tại.')
      }
      setIsSyncing(false)
    })()

    return () => {
      cancelled = true
    }
  }, [idsKey, syncFromProducts])

  return { isSyncing }
}
