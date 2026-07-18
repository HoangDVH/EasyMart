import { Search, X } from 'lucide-react'
import {
  type SellerProductsFilters,
} from '@/features/seller/components/seller-types'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

type StockTab = {
  value: SellerProductsFilters['stockStatus']
  label: string
}

const STOCK_TABS: StockTab[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'in-stock', label: 'Còn hàng' },
  { value: 'low-stock', label: 'Sắp hết' },
  { value: 'out-of-stock', label: 'Hết hàng' },
]

type SellerProductsToolbarProps = {
  filters: SellerProductsFilters
  onChange: (next: SellerProductsFilters) => void
  /** Số sản phẩm cho từng tab để hiển thị đếm nhanh. */
  counts?: Partial<Record<SellerProductsFilters['stockStatus'], number>>
}

export function SellerProductsToolbar({ filters, onChange, counts }: SellerProductsToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Tabs trạng thái kho — kiểu Shopee/Shopify admin */}
      <div
        role="tablist"
        aria-label="Lọc theo tồn kho"
        className="flex gap-1 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STOCK_TABS.map((tab) => {
          const active = filters.stockStatus === tab.value
          const count = counts?.[tab.value]
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1.5 text-sm transition-colors',
                active
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onChange({ ...filters, stockStatus: tab.value, page: 1 })}
            >
              {tab.label}
              {count != null ? (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              ) : null}
              {active ? (
                <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Search + sort + page size */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.keyword}
            placeholder="Tìm theo tên, mô tả, danh mục..."
            className="pl-9 pr-9"
            aria-label="Tìm sản phẩm"
            onChange={(e) => onChange({ ...filters, keyword: e.target.value, page: 1 })}
          />
          {filters.keyword ? (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Xóa từ khóa"
              onClick={() => onChange({ ...filters, keyword: '', page: 1 })}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.sort}
            aria-label="Sắp xếp"
            className="sm:w-44"
            onChange={(e) =>
              onChange({ ...filters, sort: e.target.value as SellerProductsFilters['sort'], page: 1 })
            }
          >
            <option value="newest">Mới nhất</option>
            <option value="name-asc">Tên A-Z</option>
            <option value="price-asc">Giá tăng dần</option>
            <option value="price-desc">Giá giảm dần</option>
            <option value="stock-asc">Kho ít nhất</option>
            <option value="stock-desc">Kho nhiều nhất</option>
          </Select>
          <Select
            value={String(filters.pageSize)}
            aria-label="Số dòng mỗi trang"
            className="w-28"
            onChange={(e) => onChange({ ...filters, pageSize: Number(e.target.value), page: 1 })}
          >
            <option value="5">5 / trang</option>
            <option value="10">10 / trang</option>
            <option value="20">20 / trang</option>
          </Select>
        </div>
      </div>
    </div>
  )
}
