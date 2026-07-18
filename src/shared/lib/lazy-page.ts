import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const RELOAD_FLAG_PREFIX = 'easymart.chunk-reload:'

/**
 * Sau khi deploy bản mới, các file chunk cũ (tên có hash) bị xóa khỏi host.
 * Trình duyệt giữ index.html cũ → import chunk cũ → "Failed to fetch dynamically imported module".
 * Xử lý: reload trang MỘT lần để nạp index.html + chunk mới. Dùng sessionStorage tránh loop vô hạn.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed')
  )
}

function reloadOnceForChunkError(key: string): never | void {
  if (typeof window === 'undefined') return
  const flagKey = `${RELOAD_FLAG_PREFIX}${key}`
  const alreadyTried = sessionStorage.getItem(flagKey)
  if (alreadyTried) return
  sessionStorage.setItem(flagKey, '1')
  window.location.reload()
}

/** Lazy-load page component exported by name from a feature module. */
export function lazyPage<T extends ComponentType<unknown>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await loader()
      const Component = module[exportName]
      if (!Component) {
        throw new Error(`Missing export "${exportName}" in lazy page module`)
      }
      /** Import thành công → xóa cờ để lần deploy sau vẫn reload được. */
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`${RELOAD_FLAG_PREFIX}${exportName}`)
      }
      return { default: Component }
    } catch (error) {
      if (isChunkLoadError(error)) {
        reloadOnceForChunkError(exportName)
      }
      throw error
    }
  })
}
