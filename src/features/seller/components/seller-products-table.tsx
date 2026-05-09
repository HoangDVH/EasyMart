import type { Product } from '@/features/products/types/product.types'
import { formatDateTime, formatVnd } from '@/features/seller/components/seller-formatters'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

type SellerProductsTableProps = {
  products: Product[]
  isLoading: boolean
  isError: boolean
  errorText: string | null
  page: number
  totalPages: number
  onPageChange: (next: number) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function SellerProductsTable({
  products,
  isLoading,
  isError,
  errorText,
  page,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}: SellerProductsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">{errorText || 'Không tải được dữ liệu sản phẩm.'}</p>
  }

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có sản phẩm phù hợp bộ lọc.</p>
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Tên</th>
              <th className="px-3 py-2 font-medium">Giá</th>
              <th className="px-3 py-2 font-medium">Kho</th>
              <th className="px-3 py-2 font-medium">Danh mục</th>
              <th className="px-3 py-2 font-medium">Tạo lúc</th>
              <th className="px-3 py-2 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t">
                <td className="px-3 py-2">
                  <p className="font-medium">{product.name}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{product.description || '—'}</p>
                </td>
                <td className="px-3 py-2">{formatVnd(product.price)}</td>
                <td className="px-3 py-2">{product.stock ?? product.stockQuantity ?? 0}</td>
                <td className="px-3 py-2">
                  <Badge>{product.categoryName ?? product.categoryId ?? '—'}</Badge>
                </td>
                <td className="px-3 py-2">{formatDateTime(product.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
                      Sửa
                    </Button>
                    <Button
                      size="sm"
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onDelete(product)}
                    >
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Trước
        </Button>
        <span className="text-xs text-muted-foreground">
          Trang {page}/{totalPages}
        </span>
        <Button size="sm" variant="outline" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          Sau
        </Button>
      </div>
    </div>
  )
}
