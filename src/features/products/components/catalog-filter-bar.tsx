import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, SlidersHorizontal, Star, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Category } from '@/features/products/types/product.types'

export type PriceFilterKey = 'all' | 'under-5m' | '5m-10m' | '10m-20m' | 'over-20m'
export type SortFilterKey = 'default' | 'price-asc' | 'price-desc' | 'rating-desc' | 'discount-desc'
export type FeaturedFilterKey = 'all' | 'featured' | 'non-featured'

type DropdownKey = 'price' | 'rating' | 'featured' | 'sort'

const PRICE_OPTIONS: { key: PriceFilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả mức giá' },
  { key: 'under-5m', label: 'Dưới 5 triệu' },
  { key: '5m-10m', label: 'Từ 5 - 10 triệu' },
  { key: '10m-20m', label: 'Từ 10 - 20 triệu' },
  { key: 'over-20m', label: 'Trên 20 triệu' },
]

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tất cả đánh giá' },
  { value: 3, label: 'Từ 3 sao trở lên' },
  { value: 4, label: 'Từ 4 sao trở lên' },
  { value: 4.5, label: 'Từ 4.5 sao trở lên' },
]

const FEATURED_OPTIONS: { key: FeaturedFilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả sản phẩm' },
  { key: 'featured', label: 'Sản phẩm nổi bật' },
  { key: 'non-featured', label: 'Không nổi bật' },
]

const SORT_OPTIONS: { key: SortFilterKey; label: string }[] = [
  { key: 'default', label: 'Mới nhất' },
  { key: 'price-asc', label: 'Giá thấp đến cao' },
  { key: 'price-desc', label: 'Giá cao đến thấp' },
  { key: 'rating-desc', label: 'Đánh giá cao nhất' },
  { key: 'discount-desc', label: 'Giảm giá mạnh nhất (trang hiện tại)' },
]

type ActiveChip = {
  id: string
  label: string
  onRemove: () => void
}

type CatalogFilterBarProps = {
  keyword?: string
  onClearKeyword?: () => void
  hasDiscountFromUrl?: boolean
  onClearDiscountUrl?: () => void
  priceFilter: PriceFilterKey
  onPriceFilterChange: (value: PriceFilterKey) => void
  /** Danh mục chọn từ CategoryNav — chỉ dùng hiển thị chip, không có dropdown trùng. */
  categoryFilter: string
  onCategoryFilterChange: (value: string) => void
  categories: Category[]
  minRatingFilter: number
  onMinRatingFilterChange: (value: number) => void
  featuredFilter: FeaturedFilterKey
  onFeaturedFilterChange: (value: FeaturedFilterKey) => void
  onlyDiscountFilter: boolean
  onOnlyDiscountFilterChange: (value: boolean) => void
  onlyInStockFilter: boolean
  onOnlyInStockFilterChange: (value: boolean) => void
  sortFilter: SortFilterKey
  onSortFilterChange: (value: SortFilterKey) => void
  totalCount: number
  visibleCount: number
  onResetFilters: () => void
  activeFilterCount: number
}

function FilterDropdownButton({
  label,
  active,
  open,
  onClick,
  panelId,
}: {
  label: string
  active?: boolean
  open?: boolean
  onClick: () => void
  panelId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open ?? false}
      aria-haspopup="listbox"
      aria-controls={open && panelId ? panelId : undefined}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
        active || open
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50',
      )}
    >
      <span className="max-w-[9rem] truncate sm:max-w-none">{label}</span>
      <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
    </button>
  )
}

function OptionRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
        selected ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted',
      )}
    >
      <span
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
        )}
        aria-hidden
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> : null}
      </span>
      {children}
    </button>
  )
}

function FilterDropdownPanel({
  open,
  anchorRef,
  align = 'left',
  children,
  panelRef,
  panelId,
}: {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  align?: 'left' | 'right'
  children: ReactNode
  panelRef: RefObject<HTMLDivElement | null>
  panelId: string
}) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })

  useEffect(() => {
    if (!open || !anchorRef.current) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const panelWidth = 280
      const estimatedHeight = 288
      let left = align === 'left' ? rect.left : rect.right - panelWidth
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8))
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow
      const top = openUp
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : rect.bottom + 6

      setStyle({
        position: 'fixed',
        top,
        left,
        width: panelWidth,
        zIndex: 9999,
        visibility: 'visible',
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, anchorRef, align])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      id={panelId}
      role="listbox"
      style={style}
      className="max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-background p-2 shadow-xl shadow-black/15"
    >
      {children}
    </div>,
    document.body,
  )
}

type DraftFilters = {
  price: PriceFilterKey
  rating: number
  featured: FeaturedFilterKey
  discount: boolean
  stock: boolean
  sort: SortFilterKey
}

const DEFAULT_DRAFT: DraftFilters = {
  price: 'all',
  rating: 0,
  featured: 'all',
  discount: false,
  stock: false,
  sort: 'default',
}

/** Pill chọn trong bottom sheet — kiểu lưới nút của Thế Giới Di Động. */
function SheetPill({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-border bg-background text-foreground hover:bg-muted/50',
      )}
    >
      {children}
    </button>
  )
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

/** Bottom sheet bộ lọc mobile kiểu Thế Giới Di Động: chọn nháp, bấm "Xem kết quả" mới áp dụng. */
function MobileFilterSheet({
  open,
  draft,
  onDraftChange,
  onClose,
  onApply,
}: {
  open: boolean
  draft: DraftFilters
  onDraftChange: (next: DraftFilters) => void
  onClose: () => void
  onApply: () => void
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] sm:hidden" role="dialog" aria-modal="true" aria-label="Bộ lọc sản phẩm">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-base font-semibold">Bộ lọc</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Đóng bộ lọc"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <SheetSection title="Sắp xếp theo">
            {SORT_OPTIONS.map((option) => (
              <SheetPill
                key={option.key}
                selected={draft.sort === option.key}
                onClick={() => onDraftChange({ ...draft, sort: option.key })}
              >
                {option.label}
              </SheetPill>
            ))}
          </SheetSection>

          <SheetSection title="Mức giá">
            {PRICE_OPTIONS.map((option) => (
              <SheetPill
                key={option.key}
                selected={draft.price === option.key}
                onClick={() => onDraftChange({ ...draft, price: option.key })}
              >
                {option.label}
              </SheetPill>
            ))}
          </SheetSection>

          <SheetSection title="Đánh giá">
            {RATING_OPTIONS.map((option) => (
              <SheetPill
                key={option.value}
                selected={draft.rating === option.value}
                onClick={() => onDraftChange({ ...draft, rating: option.value })}
              >
                <span className="inline-flex items-center gap-1">
                  {option.value > 0 ? (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                  ) : null}
                  {option.label}
                </span>
              </SheetPill>
            ))}
          </SheetSection>

          <SheetSection title="Loại sản phẩm">
            {FEATURED_OPTIONS.map((option) => (
              <SheetPill
                key={option.key}
                selected={draft.featured === option.key}
                onClick={() => onDraftChange({ ...draft, featured: option.key })}
              >
                {option.label}
              </SheetPill>
            ))}
          </SheetSection>

          <SheetSection title="Khuyến mãi & tồn kho">
            <SheetPill
              selected={draft.discount}
              onClick={() => onDraftChange({ ...draft, discount: !draft.discount })}
            >
              Đang giảm giá
            </SheetPill>
            <SheetPill
              selected={draft.stock}
              onClick={() => onDraftChange({ ...draft, stock: !draft.stock })}
            >
              Còn hàng
            </SheetPill>
          </SheetSection>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onDraftChange({ ...DEFAULT_DRAFT })}
            className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            Thiết lập lại
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Xem kết quả
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function CatalogFilterBar({
  keyword = '',
  onClearKeyword,
  hasDiscountFromUrl = false,
  onClearDiscountUrl,
  priceFilter,
  onPriceFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  minRatingFilter,
  onMinRatingFilterChange,
  featuredFilter,
  onFeaturedFilterChange,
  onlyDiscountFilter,
  onOnlyDiscountFilterChange,
  onlyInStockFilter,
  onOnlyInStockFilterChange,
  sortFilter,
  onSortFilterChange,
  totalCount,
  visibleCount,
  onResetFilters,
  activeFilterCount,
}: CatalogFilterBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const priceAnchorRef = useRef<HTMLDivElement>(null)
  const ratingAnchorRef = useRef<HTMLDivElement>(null)
  const featuredAnchorRef = useRef<HTMLDivElement>(null)
  const sortAnchorRef = useRef<HTMLDivElement>(null)
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null)
  const panelId = 'catalog-filter-panel'

  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<DraftFilters>(DEFAULT_DRAFT)

  const openSheet = () => {
    setDraft({
      price: priceFilter,
      rating: minRatingFilter,
      featured: featuredFilter,
      discount: onlyDiscountFilter,
      stock: onlyInStockFilter,
      sort: sortFilter,
    })
    setSheetOpen(true)
  }

  const applyDraft = () => {
    onPriceFilterChange(draft.price)
    onMinRatingFilterChange(draft.rating)
    onFeaturedFilterChange(draft.featured)
    onOnlyDiscountFilterChange(draft.discount)
    onOnlyInStockFilterChange(draft.stock)
    onSortFilterChange(draft.sort)
    setSheetOpen(false)
  }

  const priceLabel = PRICE_OPTIONS.find((x) => x.key === priceFilter)?.label ?? 'Mức giá'
  const ratingLabel =
    minRatingFilter > 0
      ? RATING_OPTIONS.find((x) => x.value === minRatingFilter)?.label ?? 'Đánh giá'
      : 'Đánh giá'
  const featuredLabel =
    featuredFilter === 'all'
      ? 'Nổi bật'
      : (FEATURED_OPTIONS.find((x) => x.key === featuredFilter)?.label ?? 'Nổi bật')
  const sortLabel = SORT_OPTIONS.find((x) => x.key === sortFilter)?.label ?? 'Sắp xếp'

  const toggleDropdown = (key: DropdownKey) => {
    setOpenDropdown((prev) => (prev === key ? null : key))
  }

  const closeDropdown = () => setOpenDropdown(null)

  useEffect(() => {
    if (!openDropdown) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (barRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openDropdown])

  useEffect(() => {
    if (!openDropdown) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDropdown(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openDropdown])

  const anchorRefFor = (key: DropdownKey) => {
    switch (key) {
      case 'price':
        return priceAnchorRef
      case 'rating':
        return ratingAnchorRef
      case 'featured':
        return featuredAnchorRef
      case 'sort':
        return sortAnchorRef
    }
  }

  const renderDropdownPanel = (
    key: DropdownKey,
    children: ReactNode,
    align: 'left' | 'right' = 'left',
  ) => (
    <FilterDropdownPanel
      open={openDropdown === key}
      anchorRef={anchorRefFor(key)}
      align={align}
      panelRef={panelRef}
      panelId={panelId}
    >
      {children}
    </FilterDropdownPanel>
  )

  const activeChips = useMemo(() => {
    const chips: ActiveChip[] = []
    if (keyword.trim()) {
      chips.push({
        id: 'keyword',
        label: `Từ khóa: "${keyword.trim()}"`,
        onRemove: () => onClearKeyword?.(),
      })
    }
    if (hasDiscountFromUrl && onClearDiscountUrl) {
      chips.push({ id: 'discount-url', label: 'Ưu đãi giảm giá', onRemove: onClearDiscountUrl })
    }
    if (priceFilter !== 'all') {
      const label = PRICE_OPTIONS.find((x) => x.key === priceFilter)?.label
      if (label) chips.push({ id: 'price', label, onRemove: () => onPriceFilterChange('all') })
    }
    if (categoryFilter !== 'all') {
      const name = categories.find((c) => c.id === categoryFilter)?.name
      if (name) chips.push({ id: 'category', label: name, onRemove: () => onCategoryFilterChange('all') })
    }
    if (minRatingFilter > 0) {
      const label = RATING_OPTIONS.find((x) => x.value === minRatingFilter)?.label
      if (label) chips.push({ id: 'rating', label, onRemove: () => onMinRatingFilterChange(0) })
    }
    if (featuredFilter !== 'all') {
      const label = FEATURED_OPTIONS.find((x) => x.key === featuredFilter)?.label
      if (label) chips.push({ id: 'featured', label, onRemove: () => onFeaturedFilterChange('all') })
    }
    if (onlyDiscountFilter) {
      chips.push({ id: 'discount', label: 'Đang giảm giá', onRemove: () => onOnlyDiscountFilterChange(false) })
    }
    if (onlyInStockFilter) {
      chips.push({ id: 'stock', label: 'Còn hàng', onRemove: () => onOnlyInStockFilterChange(false) })
    }
    if (sortFilter !== 'default') {
      const label = SORT_OPTIONS.find((x) => x.key === sortFilter)?.label
      if (label) chips.push({ id: 'sort', label: `Sắp xếp: ${label}`, onRemove: () => onSortFilterChange('default') })
    }
    return chips
  }, [
    keyword,
    hasDiscountFromUrl,
    onClearKeyword,
    onClearDiscountUrl,
    priceFilter,
    categoryFilter,
    categories,
    minRatingFilter,
    featuredFilter,
    onlyDiscountFilter,
    onlyInStockFilter,
    sortFilter,
    onPriceFilterChange,
    onCategoryFilterChange,
    onMinRatingFilterChange,
    onFeaturedFilterChange,
    onOnlyDiscountFilterChange,
    onOnlyInStockFilterChange,
    onSortFilterChange,
  ])

  return (
    <div ref={barRef} className="space-y-3">
      <div className="sticky-below-header sticky z-20 rounded-xl border border-border/70 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/90">
        {/* Thanh lọc mobile kiểu Thế Giới Di Động: nút Lọc mở bottom sheet + chip lọc nhanh cuộn ngang */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border/60 p-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={openSheet}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors',
              activeFilterCount > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-foreground',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Lọc
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => onOnlyDiscountFilterChange(!onlyDiscountFilter)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-medium transition-colors',
              onlyDiscountFilter
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-border bg-background',
            )}
          >
            Giảm giá
          </button>
          <button
            type="button"
            onClick={() => onOnlyInStockFilterChange(!onlyInStockFilter)}
            className={cn(
              'inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-medium transition-colors',
              onlyInStockFilter
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background',
            )}
          >
            Còn hàng
          </button>
          {PRICE_OPTIONS.filter((option) => option.key !== 'all').map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onPriceFilterChange(priceFilter === option.key ? 'all' : option.key)}
              className={cn(
                'inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-sm font-medium transition-colors',
                priceFilter === option.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <MobileFilterSheet
          open={sheetOpen}
          draft={draft}
          onDraftChange={setDraft}
          onClose={() => setSheetOpen(false)}
          onApply={applyDraft}
        />

        <div className="hidden items-stretch gap-2 border-b border-border/60 p-2 sm:flex sm:p-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="hidden shrink-0 items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Lọc
            </span>

            <div ref={priceAnchorRef} className="shrink-0">
              <FilterDropdownButton
                label={priceFilter === 'all' ? 'Mức giá' : priceLabel}
                active={priceFilter !== 'all'}
                open={openDropdown === 'price'}
                panelId={panelId}
                onClick={() => toggleDropdown('price')}
              />
            </div>
            {renderDropdownPanel(
              'price',
              PRICE_OPTIONS.map((option) => (
                <OptionRow
                  key={option.key}
                  selected={priceFilter === option.key}
                  onClick={() => {
                    onPriceFilterChange(option.key)
                    closeDropdown()
                  }}
                >
                  {option.label}
                </OptionRow>
              )),
            )}

            <div ref={ratingAnchorRef} className="shrink-0">
              <FilterDropdownButton
                label={ratingLabel}
                active={minRatingFilter > 0}
                open={openDropdown === 'rating'}
                panelId={panelId}
                onClick={() => toggleDropdown('rating')}
              />
            </div>
            {renderDropdownPanel(
              'rating',
              RATING_OPTIONS.map((option) => (
                <OptionRow
                  key={option.value}
                  selected={minRatingFilter === option.value}
                  onClick={() => {
                    onMinRatingFilterChange(option.value)
                    closeDropdown()
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {option.value > 0 ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : null}
                    {option.label}
                  </span>
                </OptionRow>
              )),
            )}

            <div ref={featuredAnchorRef} className="shrink-0">
              <FilterDropdownButton
                label={featuredLabel}
                active={featuredFilter !== 'all'}
                open={openDropdown === 'featured'}
                panelId={panelId}
                onClick={() => toggleDropdown('featured')}
              />
            </div>
            {renderDropdownPanel(
              'featured',
              FEATURED_OPTIONS.map((option) => (
                <OptionRow
                  key={option.key}
                  selected={featuredFilter === option.key}
                  onClick={() => {
                    onFeaturedFilterChange(option.key)
                    closeDropdown()
                  }}
                >
                  {option.label}
                </OptionRow>
              )),
            )}

            <button
              type="button"
              onClick={() => onOnlyDiscountFilterChange(!onlyDiscountFilter)}
              className={cn(
                'inline-flex shrink-0 items-center rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
                onlyDiscountFilter
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-border bg-background hover:border-secondary/40 hover:bg-muted/50',
              )}
            >
              Giảm giá
            </button>

            <button
              type="button"
              onClick={() => onOnlyInStockFilterChange(!onlyInStockFilter)}
              className={cn(
                'inline-flex shrink-0 items-center rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
                onlyInStockFilter
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/50',
              )}
            >
              Còn hàng
            </button>
          </div>

          <div ref={sortAnchorRef} className="relative shrink-0 border-l border-border/60 pl-2 sm:pl-3">
            <FilterDropdownButton
              label={sortLabel}
              active={sortFilter !== 'default'}
              open={openDropdown === 'sort'}
              panelId={panelId}
              onClick={() => toggleDropdown('sort')}
            />
          </div>
          {renderDropdownPanel(
            'sort',
            SORT_OPTIONS.map((option) => (
              <OptionRow
                key={option.key}
                selected={sortFilter === option.key}
                onClick={() => {
                  onSortFilterChange(option.key)
                  closeDropdown()
                }}
              >
                {option.label}
              </OptionRow>
            )),
            'right',
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm">
          <p className="text-muted-foreground">
            {totalCount > 0 ? (
              <>
                Hiển thị <span className="font-medium text-foreground">{visibleCount}</span>
                {totalCount !== visibleCount ? (
                  <>
                    {' '}
                    / <span className="font-medium text-foreground">{totalCount}</span>
                  </>
                ) : null}{' '}
                sản phẩm
              </>
            ) : (
              'Không có sản phẩm phù hợp'
            )}
          </p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="font-medium text-primary hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Đang lọc:</span>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <span className="min-w-0 truncate">{chip.label}</span>
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
