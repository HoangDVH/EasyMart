import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'

const RELOAD_FLAG = 'easymart.route-error-reload'

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed')
  )
}

/** Màn hình lỗi thay cho "Unexpected Application Error" mặc định của React Router. */
export function RouteErrorBoundary() {
  const error = useRouteError()

  /** Lỗi tải chunk (thường do vừa deploy) → tự reload 1 lần để lấy bản mới. */
  useEffect(() => {
    if (!isChunkLoadError(error)) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
    window.location.reload()
  }, [error])

  const chunkError = isChunkLoadError(error)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10">
        <RefreshCw className="h-8 w-8 text-primary" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {chunkError ? 'Đang cập nhật phiên bản mới' : 'Đã có lỗi xảy ra'}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {chunkError
            ? 'Ứng dụng vừa được cập nhật. Vui lòng tải lại trang để dùng phiên bản mới nhất.'
            : 'Rất tiếc, trang gặp sự cố khi hiển thị. Bạn hãy thử tải lại hoặc quay về trang chủ.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tải lại trang
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Về trang chủ
        </Button>
      </div>
    </div>
  )
}
