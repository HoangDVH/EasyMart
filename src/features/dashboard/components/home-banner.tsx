import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type BannerImage = {
  id: string
  src: string
  alt: string
  to: string
}

const MAIN_SLIDES: BannerImage[] = [
  {
    id: 'tech-sale',
    src: '/banners/banner-tech-sale-wide.png',
    alt: 'Tuần lễ công nghệ — giảm đến 50%',
    to: '/?hasDiscount=1',
  },
  {
    id: 'phone-sale',
    src: '/banners/banner-phone-sale-wide.png',
    alt: 'Siêu sale điện thoại — chỉ từ 1.990.000đ, trả góp 0%',
    to: '/?hasDiscount=1',
  },
  {
    id: 'pc',
    src: '/banners/banner-pc-wide.png',
    alt: 'PC Gaming — hiệu năng đỉnh cao',
    to: '/?hasDiscount=1',
  },
  {
    id: 'tablet',
    src: '/banners/banner-tablet-wide.png',
    alt: 'Tablet — giảm sốc cuối tuần',
    to: '/?hasDiscount=1',
  },
  {
    id: 'accessory',
    src: '/banners/banner-accessory-wide.png',
    alt: 'Phụ kiện — deal hot mỗi ngày',
    to: '/?hasDiscount=1',
  },
]

const SIDE_BANNERS: BannerImage[] = [
  {
    id: 'watch',
    src: '/banners/banner-watch-wide.png',
    alt: 'Đồng hồ cao cấp — đẳng cấp quý ông',
    to: '/',
  },
  {
    id: 'freeship',
    src: '/banners/banner-freeship-wide.png',
    alt: 'Freeship toàn quốc — đơn từ 300K',
    to: '/?hasDiscount=1',
  },
]

const AUTO_PLAY_MS = 5000

export function HomeBanner() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + MAIN_SLIDES.length) % MAIN_SLIDES.length)
  }, [])

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  useEffect(() => {
    if (isPaused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MAIN_SLIDES.length)
    }, AUTO_PLAY_MS)
    return () => window.clearInterval(timer)
  }, [isPaused])

  return (
    <section
      className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch"
      aria-label="Banner khuyến mãi"
    >
      {/* Banner lớn — carousel ảnh */}
      <div
        className="relative h-40 w-full overflow-hidden rounded-xl border bg-muted/40 shadow-sm sm:h-44 lg:h-48"
        aria-roledescription="carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsPaused(false)
          }
        }}
      >
        {MAIN_SLIDES.map((item, index) => (
          <Link
            key={item.id}
            to={item.to}
            tabIndex={index === activeIndex ? 0 : -1}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-in-out',
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={index !== activeIndex}
          >
            <img
              src={item.src}
              alt={item.alt}
              className="h-full w-full object-cover object-center"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </Link>
        ))}

        <button
          type="button"
          className="absolute left-1.5 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 sm:left-2 sm:h-9 sm:w-9"
          onClick={goPrev}
          aria-label="Slide trước"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="absolute right-1.5 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50 sm:right-2 sm:h-9 sm:w-9"
          onClick={goNext}
          aria-label="Slide sau"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {MAIN_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-2.5 rounded-full transition-all',
                index === activeIndex ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/75',
              )}
              onClick={() => goTo(index)}
              aria-label={`Chuyển tới slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>

      {/* 2 banner nhỏ bên phải — cùng chiều cao tổng với banner lớn */}
      <div className="grid h-40 grid-cols-2 gap-2 sm:h-44 sm:gap-3 lg:h-48 lg:grid-cols-1 lg:grid-rows-2">
        {SIDE_BANNERS.map((banner) => (
          <Link
            key={banner.id}
            to={banner.to}
            className="group relative block min-h-0 overflow-hidden rounded-lg border bg-muted/40 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <img
              src={banner.src}
              alt={banner.alt}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}
