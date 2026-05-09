import type { SellerProductsFilters } from '@/features/seller/components/seller-types'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'

type SellerProductsToolbarProps = {
  filters: SellerProductsFilters
  onChange: (next: SellerProductsFilters) => void
}

export function SellerProductsToolbar({ filters, onChange }: SellerProductsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-4">
      <div className="grid gap-1">
        <Label htmlFor="seller-filter-keyword">Search</Label>
        <Input
          id="seller-filter-keyword"
          value={filters.keyword}
          placeholder="Tìm theo tên/mô tả"
          onChange={(e) => onChange({ ...filters, keyword: e.target.value, page: 1 })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="seller-filter-stock">Filter stock</Label>
        <Select
          id="seller-filter-stock"
          value={filters.stockStatus}
          onChange={(e) =>
            onChange({
              ...filters,
              stockStatus: e.target.value as SellerProductsFilters['stockStatus'],
              page: 1,
            })
          }
        >
          <option value="all">Tất cả</option>
          <option value="in-stock">Còn hàng</option>
          <option value="out-of-stock">Hết hàng</option>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="seller-filter-sort">Sort</Label>
        <Select
          id="seller-filter-sort"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as SellerProductsFilters['sort'], page: 1 })}
        >
          <option value="newest">Mới nhất</option>
          <option value="name-asc">Tên A-Z</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
          <option value="stock-asc">Kho tăng dần</option>
          <option value="stock-desc">Kho giảm dần</option>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="seller-filter-page-size">Pagination size</Label>
        <Select
          id="seller-filter-page-size"
          value={String(filters.pageSize)}
          onChange={(e) => onChange({ ...filters, pageSize: Number(e.target.value), page: 1 })}
        >
          <option value="5">5 / trang</option>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
        </Select>
      </div>
    </div>
  )
}
