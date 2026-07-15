import { Loader2 } from 'lucide-react'

/** Fallback khi lazy route đang tải chunk — giữ header/layout, chỉ vùng nội dung. */
export function RouteChunkFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[min(40vh,320px)] flex-col items-center justify-center gap-3 py-10"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Đang tải trang...</p>
    </div>
  )
}
