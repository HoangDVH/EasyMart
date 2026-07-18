import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Cuộn lên đầu trang mỗi khi chuyển sang route khác (không áp dụng khi chỉ đổi query). */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
