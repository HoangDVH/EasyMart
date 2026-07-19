import { ChevronLeft, ChevronRight, ImageOff, PackageSearch, Pencil, Star, Trash2 } from 'lucide-react'
import type { Product } from '@/features/products/types/product.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import {
  getProductStock,
  LOW_STOCK_THRESHOLD,
} from '@/features/seller/components/seller-types'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'

type SellerProductsTableProps = {
  products: Product[]
  isLoading: boolean
  isError: boolean
  errorText: string | null
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (next: number) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  /** Bulk select: id các sản phẩm đang chọn (trên mọi trang). */
  selectedIds: ReadonlySet<string>
  onToggleSelect: (productId: string) => void
  /** Chọn/bỏ chọn toàn bộ sản phẩm đang hiển thị trên trang. */
  onToggleSelectPage: (productIds: string[], checked: boolean) => void
}

function ProductThumb({ product }: { product: Product }) {
  const src = product.images?.[0] ?? product.imageUrl ?? null
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted/40">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <ImageOff className="h-4 w-4 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  )
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return <Badge className="border-destructive/30 bg-destructive/10 text-destructive">Hết hàng</Badge>
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <Badge className="border-amber-300/60 bg-amber-50 text-amber-700">Sắp hết · {stock}</Badge>
  }
  return <Badge className="border-emerald-300/60 bg-emerald-50 text-emerald-700">Còn hàng · {stock}</Badge>
}

function PriceCell({ product }: { product: Product }) {
  const price = product.price ?? 0
  const discount = product.discountPrice
  const hasDiscount = discount != null && discount > 0 && discount < price
  return (
    <div className="leading-tight">
      <p className="font-medium tabular-nums">{formatVnd(hasDiscount ? discount : price)}</p>
      {hasDiscount ? (
        <p className="text-xs text-muted-foreground line-through tabular-nums">{formatVnd(price)}</p>
      ) : null}
    </div>
  )
}

function RowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
        aria-label={`Sửa ${product.name}`}
        title="Sửa"
        onClick={() => onEdit(product)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-10 w-10 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-8"
        aria-label={`Xóa ${product.name}`}
        title="Xóa"
        onClick={() => onDelete(product)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalItems: number
  onPageChange: (next: number) => void
}) {
  /** Tối đa 5 số trang, luôn bám quanh trang hiện tại. */
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)

  return (
    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        {totalItems} sản phẩm · trang {page}/{totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-10 p-0 sm:h-8 sm:w-8"
          aria-label="Trang trước"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? 'default' : 'outline'}
            className="h-10 w-10 p-0 tabular-nums sm:h-8 sm:w-8"
            aria-label={`Trang ${p}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-10 w-10 p-0 sm:h-8 sm:w-8"
          aria-label="Trang sau"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function SellerProductsTable({
  products,
  isLoading,
  isError,
  errorText,
  page,
  totalPages,
  totalItems,
  onPageChange,
  onEdit,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
}: SellerProductsTableProps) {
  const pageIds = products.map((p) => String(p.id))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id))

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">{errorText || 'Không tải được dữ liệu sản phẩm.'}</p>
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Không có sản phẩm"
        description="Không tìm thấy sản phẩm phù hợp bộ lọc hiện tại. Thử đổi từ khóa hoặc trạng thái kho."
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {products.map((product) => {
          const stock = getProductStock(product)
          const checked = selectedIds.has(String(product.id))
          return (
            <div
              key={product.id}
              className={cn('rounded-lg border p-3', checked && 'border-primary/50 bg-primary/5')}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-2 h-5 w-5 shrink-0 accent-primary"
                  checked={checked}
                  aria-label={`Chọn ${product.name}`}
                  onChange={() => onToggleSelect(String(product.id))}
                />
                <ProductThumb product={product} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.categoryName ?? product.categoryId ?? '—'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PriceCell product={product} />
                    <StockBadge stock={stock} />
                  </div>
                </div>
                <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: data table */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allPageSelected && somePageSelected
                  }}
                  aria-label="Chọn tất cả sản phẩm trang này"
                  onChange={(e) => onToggleSelectPage(pageIds, e.target.checked)}
                />
              </th>
              <th className="px-4 py-3 font-medium">Sản phẩm</th>
              <th className="px-4 py-3 font-medium">Giá bán</th>
              <th className="px-4 py-3 font-medium">Tồn kho</th>
              <th className="px-4 py-3 font-medium">Danh mục</th>
              <th className="px-4 py-3 font-medium">Đánh giá</th>
              <th className="px-4 py-3 font-medium">Ngày tạo</th>
              <th className="sticky right-0 z-10 border-l bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-background))] px-4 py-3 text-right font-medium">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => {
              const stock = getProductStock(product)
              const checked = selectedIds.has(String(product.id))
              return (
                <tr
                  key={product.id}
                  className={cn('group transition-colors hover:bg-muted/30', checked && 'bg-primary/5')}
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-primary"
                      checked={checked}
                      aria-label={`Chọn ${product.name}`}
                      onChange={() => onToggleSelect(String(product.id))}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={product} />
                      {/* Tên dài không cắt — bảng nở ra và cuộn ngang, cột Thao tác vẫn ghim bên phải. */}
                      <div>
                        <p className="whitespace-nowrap font-medium">{product.name}</p>
                        <p className="max-w-[420px] truncate text-xs text-muted-foreground">
                          {product.description || '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <PriceCell product={product} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StockBadge stock={stock} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <span className="text-muted-foreground">
                      {product.categoryName ?? product.categoryId ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {product.rating != null && product.rating > 0 ? (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden />
                        {product.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDateTime(product.createdAt)}
                  </td>
                  <td
                    className={cn(
                      'sticky right-0 z-10 border-l bg-background px-4 py-2.5 transition-colors',
                      'group-hover:bg-[color-mix(in_oklab,var(--color-muted)_30%,var(--color-background))]',
                      checked &&
                        'bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-background))]',
                    )}
                  >
                    <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={onPageChange} />
    </div>
  )
}
