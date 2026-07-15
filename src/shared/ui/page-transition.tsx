import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { RouteChunkFallback } from '@/shared/ui/route-chunk-fallback'

/** Fade-in nhẹ khi chuyển route — bọc Outlet trong layout. */
export function AnimatedOutlet() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="animate-page-enter">
      <Suspense fallback={<RouteChunkFallback />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
