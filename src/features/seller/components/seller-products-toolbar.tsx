import { Search, X } from 'lucide-react'
import { type SellerProductsFilters } from '@/features/seller/components/seller-types'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'

const STOCK_OPTIONS: {
  value: SellerProductsFilters['stockStatus']
  label: string
}[] = [
  { value: 'all', label: 'Tất cả tồn kho' },
  { value: 'in-stock', label: 'Còn hàng' },
  { value: 'low-stock', label: 'Sắp hết' },
  { value: 'out-of-stock', label: 'Hết hàng' },
]

type SellerProductsToolbarProps = {
  filters: SellerProductsFilters
  onChange: (next: SellerProductsFilters) => void
  counts?: Partial<Record<SellerProductsFilters['stockStatus'], number>>
}

export function SellerProductsToolbar({ filters, onChange, counts }: SellerProductsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1 md:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={filters.keyword}
          placeholder="Tìm theo tên, mô tả, danh mục…"
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

      <Select
        value={filters.stockStatus}
        aria-label="Lọc theo tồn kho"
        className="md:w-48"
        onChange={(e) =>
          onChange({
            ...filters,
            stockStatus: e.target.value as SellerProductsFilters['stockStatus'],
            page: 1,
          })
        }
      >
        {STOCK_OPTIONS.map((option) => {
          const count = counts?.[option.value]
          const suffix = count != null ? ` (${count})` : ''
          return (
            <option key={option.value} value={option.value}>
              {option.label}
              {suffix}
            </option>
          )
        })}
      </Select>

      <Select
        value={filters.sort}
        aria-label="Sắp xếp"
        className="md:w-44"
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
        className="md:w-32"
        onChange={(e) => onChange({ ...filters, pageSize: Number(e.target.value), page: 1 })}
      >
        <option value="5">5 / trang</option>
        <option value="10">10 / trang</option>
        <option value="20">20 / trang</option>
      </Select>
    </div>
  )
}
