import { Outlet, useLocation } from 'react-router-dom'

/** Fade-in nhẹ khi chuyển route — bọc Outlet trong layout. */
export function AnimatedOutlet() {
  const location = useLocation()

  return (
    <div key={location.pathname} className="animate-page-enter">
      <Outlet />
    </div>
  )
}
