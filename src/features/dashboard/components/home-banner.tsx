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

function BannerDecor() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.2),transparent_42%)]" />
      <div className="absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 left-1/3 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
    </>
  )
}

function SideBannerCard({ banner }: { banner: SideBanner }) {
  const Icon = banner.icon

  return (
    <Link
      to={banner.ctaTo}
      className={cn(
        'group relative flex min-h-[7.5rem] flex-1 overflow-hidden rounded-xl border shadow-sm sm:min-h-0',
        'bg-gradient-to-br text-primary-foreground transition hover:brightness-105',
        banner.gradient,
      )}
    >
      <BannerDecor />
      <div className="relative flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
            <Icon className="h-3 w-3" aria-hidden />
            EasyMart
          </div>
          <h3 className="text-base font-bold leading-tight sm:text-lg">{banner.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-primary-foreground/90 sm:text-sm">
            {banner.subtitle}
          </p>
        </div>
        <span className="mt-3 inline-flex w-fit rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition group-hover:bg-white/30">
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
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MAIN_SLIDES.length)
    }, AUTO_PLAY_MS)
    return () => window.clearInterval(timer)
  }, [isPaused])

  const slide = MAIN_SLIDES[activeIndex]
  const Icon = slide.icon

  return (
    <section
      className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-4"
      aria-label="Banner khuyến mãi"
    >
      {/* Banner lớn — carousel */}
      <div
        className="relative overflow-hidden rounded-2xl border shadow-sm"
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
        <div className="relative aspect-[16/9] lg:aspect-[21/9] lg:h-full lg:min-h-[280px]">
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

          <div className="relative flex h-full flex-col justify-center px-5 py-6 text-primary-foreground sm:px-8 sm:py-8">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              EasyMart
            </div>
            <h2 className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              {slide.title}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-primary-foreground/90 sm:text-base">
              {slide.subtitle}
            </p>
            <div className="mt-4 sm:mt-5">
              <Link to={slide.ctaTo}>
                <Button size="lg" variant="secondary" className="shadow-md hover:brightness-105">
                  {slide.ctaLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/35 sm:left-3 sm:h-9 sm:w-9"
          onClick={goPrev}
          aria-label="Slide trước"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
        <button
          type="button"
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/35 sm:right-3 sm:h-9 sm:w-9"
          onClick={goNext}
          aria-label="Slide sau"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {MAIN_SLIDES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'h-2 rounded-full transition-all',
                index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/75',
              )}
              onClick={() => goTo(index)}
              aria-label={`Chuyển tới slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      </div>

      {/* 2 banner nhỏ bên phải — desktop; mobile xếp 2 cột dưới banner lớn */}
      <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:gap-4">
        {SIDE_BANNERS.map((banner) => (
          <SideBannerCard key={banner.id} banner={banner} />
        ))}
      </div>
    </section>
  )
}
