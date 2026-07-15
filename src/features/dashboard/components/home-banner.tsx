import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, Truck, Tag } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

type MainSlide = {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaTo: string
  icon: typeof Tag
  gradient: string
}

type SideBanner = {
  id: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaTo: string
  icon: typeof Tag
  gradient: string
}

const MAIN_SLIDES: MainSlide[] = [
  {
    id: 'sale',
    title: 'Giảm giá cuối tuần',
    subtitle: 'Hàng ngàn sản phẩm giảm đến 50%. Săn deal ngay trước khi hết hàng.',
    ctaLabel: 'Xem ưu đãi',
    ctaTo: '/?hasDiscount=1',
    icon: Tag,
    gradient: 'from-primary/95 via-primary/80 to-blue-600/75',
  },
  {
    id: 'new',
    title: 'Hàng mới về',
    subtitle: 'Cập nhật xu hướng mới nhất — điện thoại, phụ kiện, thiết bị số chính hãng.',
    ctaLabel: 'Khám phá ngay',
    ctaTo: '/',
    icon: Sparkles,
    gradient: 'from-indigo-600/95 via-primary/85 to-sky-500/75',
  },
]

const SIDE_BANNERS: SideBanner[] = [
  {
    id: 'freeship',
    title: 'Freeship 500k',
    subtitle: 'Miễn phí vận chuyển toàn quốc',
    ctaLabel: 'Mua ngay',
    ctaTo: '/',
    icon: Truck,
    gradient: 'from-secondary/95 via-secondary/85 to-orange-500/80',
  },
  {
    id: 'hot-deal',
    title: 'Deal hot hôm nay',
    subtitle: 'Giá sốc — số lượng có hạn',
    ctaLabel: 'Săn deal',
    ctaTo: '/?hasDiscount=1',
    icon: Tag,
    gradient: 'from-rose-600/95 via-secondary/80 to-orange-500/75',
  },
]

const AUTO_PLAY_MS = 5000

function BannerDecor({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.2),transparent_42%)]" />
      <div
        className={cn(
          'absolute -right-4 -top-4 rounded-full bg-white/10 blur-2xl',
          compact ? 'h-20 w-20' : 'h-36 w-36',
        )}
      />
      <div
        className={cn(
          'absolute -bottom-6 left-1/3 rounded-full bg-black/10 blur-2xl',
          compact ? 'h-16 w-16' : 'h-28 w-28',
        )}
      />
    </>
  )
}

function SideBannerCard({ banner }: { banner: SideBanner }) {
  const Icon = banner.icon

  return (
    <Link
      to={banner.ctaTo}
      className={cn(
        'group relative flex min-h-[4.5rem] flex-1 overflow-hidden rounded-lg border shadow-sm sm:min-h-[5rem]',
        'lg:min-h-0 lg:h-auto',
        'bg-gradient-to-br text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-md',
        banner.gradient,
      )}
    >
      <BannerDecor compact />
      <div className="relative flex flex-1 items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-medium backdrop-blur-sm">
            <Icon className="h-2.5 w-2.5" aria-hidden />
            EasyMart
          </div>
          <h3 className="truncate text-sm font-bold leading-tight">{banner.title}</h3>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-primary-foreground/90 sm:text-xs">
            {banner.subtitle}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm transition group-hover:bg-white/30 sm:inline-flex">
          {banner.ctaLabel} →
        </span>
      </div>
    </Link>
  )
}

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

  const slide = MAIN_SLIDES[activeIndex]
  const Icon = slide.icon

  return (
    <section
      className="grid gap-2 sm:gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch"
      aria-label="Banner khuyến mãi"
    >
      {/* Banner lớn — carousel */}
      <div
        className="relative h-[7.5rem] w-full overflow-hidden rounded-xl border shadow-sm sm:h-[8.5rem] lg:h-full lg:min-h-0"
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
          <div
            key={item.id}
            className={cn(
              'absolute inset-0 bg-gradient-to-r transition-opacity duration-700 ease-in-out',
              item.gradient,
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={index !== activeIndex}
          >
            <BannerDecor />
          </div>
        ))}

        <div
          key={activeIndex}
          className="relative z-10 flex h-full flex-col justify-center px-9 py-2 text-primary-foreground sm:px-10 sm:py-3"
        >
          <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm sm:text-xs">
            <Icon className="h-3 w-3" aria-hidden />
            EasyMart
          </div>
          <h2 className="line-clamp-1 text-base font-bold tracking-tight sm:text-lg lg:text-xl">
            {slide.title}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-xs text-primary-foreground/90 sm:text-sm">
            {slide.subtitle}
          </p>
          <div className="mt-1.5">
            <Link to={slide.ctaTo}>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2.5 text-xs shadow-sm hover:brightness-105 sm:h-8 sm:px-3"
              >
                {slide.ctaLabel}
              </Button>
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="absolute left-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 sm:left-2"
          onClick={goPrev}
          aria-label="Slide trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="absolute right-1.5 top-1/2 z-20 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 sm:right-2"
          onClick={goNext}
          aria-label="Slide sau"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <div className="absolute bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {MAIN_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/75',
              )}
              onClick={() => goTo(index)}
              aria-label={`Chuyển tới slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>

      {/* 2 banner nhỏ bên phải — desktop; mobile xếp 2 cột dưới banner lớn */}
      <div className="flex min-h-0 flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:flex lg:h-full lg:gap-3">
        {SIDE_BANNERS.map((banner) => (
          <SideBannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  )
}
