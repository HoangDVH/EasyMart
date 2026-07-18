import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, X, Clock, ArrowUpRight } from 'lucide-react'
import { productsApi } from '@/features/products/api/products.api'
import { getProductsQueryKey, prefetchProductList } from '@/features/products/hooks/use-catalog'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

const RECENT_KEY = 'easymart.recent-searches'
const RECENT_MAX = 6
const SUGGEST_LIMIT = 6
const CATALOG_PAGE_SIZE = 8
const DEBOUNCE_MS = 320
const MIN_SEARCH_CHARS = 2
const SEARCH_SORT = 'createdAt,desc'

function formatVnd(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return ''
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)))
  } catch {
    /* localStorage có thể bị tắt */
  }
}

function pushRecent(keyword: string) {
  const trimmed = keyword.trim()
  if (!trimmed) return
  const current = loadRecent().filter((x) => x.toLowerCase() !== trimmed.toLowerCase())
  current.unshift(trimmed)
  saveRecent(current)
}

export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialKeyword = searchParams.get('keyword')?.trim() ?? ''
  const [value, setValue] = useState(initialKeyword)
  const [debounced, setDebounced] = useState(initialKeyword)
  const [isOpen, setIsOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => loadRecent())
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  /** Đồng bộ input khi URL thay đổi (vd: click category → set keyword=''). */
  useEffect(() => {
    setValue(initialKeyword)
  }, [initialKeyword])

  /** Debounce keyword cho suggestion fetch. */
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [value])

  const searchListParams = useMemo(
    () => ({
      page: 0,
      size: CATALOG_PAGE_SIZE,
      keyword: debounced,
      sort: SEARCH_SORT,
    }),
    [debounced],
  )

  const canSuggest = debounced.length >= MIN_SEARCH_CHARS

  const suggestQuery = useQuery({
    queryKey: getProductsQueryKey(searchListParams),
    queryFn: ({ signal }) => productsApi.listWindow(searchListParams, signal),
    enabled: isOpen && canSuggest,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  })

  const suggestions = (suggestQuery.data?.content ?? []).slice(0, SUGGEST_LIMIT)
  const showRecent = isOpen && debounced.length === 0 && recent.length > 0
  const showSuggestions = isOpen && debounced.length > 0
  const showMinCharsHint = showSuggestions && !canSuggest
  const showEmpty = showSuggestions && canSuggest && !suggestQuery.isPending && suggestions.length === 0

  /** Tổng item navigate được bằng phím để set activeIdx */
  const navigableItems = useMemo(() => {
    if (showRecent) return recent.map((q) => ({ kind: 'recent' as const, value: q }))
    if (showSuggestions)
      return suggestions.map((p) => ({ kind: 'product' as const, value: p.id, label: p.name }))
    return []
  }, [showRecent, showSuggestions, recent, suggestions])

  useEffect(() => {
    setActiveIdx(-1)
  }, [debounced, isOpen])

  /** Đóng khi click ngoài */
  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isOpen])

  const goSearch = (keyword: string) => {
    const trimmed = keyword.trim()
    pushRecent(trimmed)
    setRecent(loadRecent())
    setIsOpen(false)
    inputRef.current?.blur()

    if (trimmed) {
      prefetchProductList(queryClient, {
        page: 0,
        size: CATALOG_PAGE_SIZE,
        keyword: trimmed,
        sort: SEARCH_SORT,
      })
    }

    const next = new URLSearchParams(searchParams)
    if (trimmed) next.set('keyword', trimmed)
    else next.delete('keyword')
    navigate({ pathname: '/', search: next.toString() ? `?${next.toString()}` : '' })
  }

  const goProduct = (productId: string) => {
    setIsOpen(false)
    inputRef.current?.blur()
    navigate(`/products/${productId}`)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (activeIdx >= 0 && navigableItems[activeIdx]) {
      const item = navigableItems[activeIdx]
      if (item.kind === 'recent') goSearch(item.value)
      else goProduct(item.value)
      return
    }
    goSearch(value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((idx) => (navigableItems.length === 0 ? -1 : (idx + 1) % navigableItems.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((idx) => (navigableItems.length === 0 ? -1 : (idx - 1 + navigableItems.length) % navigableItems.length))
    }
  }

  const clearRecentAll = () => {
    saveRecent([])
    setRecent([])
  }

  const removeRecent = (q: string) => {
    const next = recent.filter((x) => x !== q)
    saveRecent(next)
    setRecent(next)
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={onSubmit} role="search">
        {/* Search bar kiểu Shopee: khung trắng, nút tìm màu primary nằm bên trong */}
        <div className="relative flex items-center rounded-md bg-background p-1 shadow-md">
          <Input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            placeholder="Tìm kiếm sản phẩm…"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={onKeyDown}
            className="h-9 flex-1 border-none bg-transparent pl-3 pr-8 text-base text-foreground shadow-none sm:text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Tìm sản phẩm"
            aria-autocomplete="list"
            aria-expanded={isOpen}
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                setValue('')
                inputRef.current?.focus()
              }}
              className="absolute right-14 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground sm:right-16"
              aria-label="Xóa từ khoá"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            type="submit"
            className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground transition hover:brightness-110 sm:w-14"
            aria-label="Tìm kiếm"
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>

      {isOpen && (showRecent || showSuggestions) ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
          role="listbox"
        >
          {showRecent ? (
            <div className="p-1">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  onClick={clearRecentAll}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
              {recent.map((q, i) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => goSearch(q)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm',
                    activeIdx === i ? 'bg-muted' : 'hover:bg-muted/60',
                  )}
                  role="option"
                  aria-selected={activeIdx === i}
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {q}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeRecent(q)
                    }}
                    className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-background hover:text-foreground"
                    aria-label={`Xóa lịch sử "${q}"`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {showSuggestions ? (
            <div className="p-1">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Gợi ý sản phẩm
                </span>
                {suggestQuery.isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
                ) : null}
              </div>

              {showMinCharsHint ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Nhập thêm ít nhất {MIN_SEARCH_CHARS} ký tự để xem gợi ý.
                </div>
              ) : null}

              {canSuggest
                ? suggestions.map((product, i) => {
                const price =
                  product.discountPrice != null && product.price != null && product.discountPrice < product.price
                    ? product.discountPrice
                    : product.price
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => goProduct(product.id)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left',
                      activeIdx === i ? 'bg-muted' : 'hover:bg-muted/60',
                    )}
                    role="option"
                    aria-selected={activeIdx === i}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {price != null ? formatVnd(price) : ''}
                        {product.categoryName ? <> · {product.categoryName}</> : null}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                )
              })
                : null}

              {showEmpty ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  Không có gợi ý cho "<span className="font-medium text-foreground">{debounced}</span>".
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => goSearch(value)}
                className="mt-1 flex w-full items-center justify-between rounded-md border-t px-2 py-2 text-left text-sm hover:bg-muted/60"
              >
                <span className="flex items-center gap-2 text-primary">
                  <Search className="h-3.5 w-3.5" />
                  Xem tất cả kết quả cho "{value.trim()}"
                </span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
