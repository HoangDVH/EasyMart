import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCategoriesQuery } from '@/features/products/hooks/use-catalog'
import { productsApi } from '@/features/products/api/products.api'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useCreateSellerProductMutation,
  useDeleteSellerProductMutation,
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
  useUpdateSellerOrderStatusMutation,
  useUpdateSellerProductMutation,
  useUploadSellerImagesMutation,
} from '@/features/seller/hooks/use-seller'
import { useSellerOrdersRealtime } from '@/features/seller/hooks/use-seller-orders-realtime'
import { FULFILLMENT_LABELS, isFulfillmentStatus } from '@/features/seller/lib/fulfillment'
import type { Order } from '@/features/orders/types/order.types'
import { isAxiosError } from 'axios'
import { cn } from '@/shared/lib/utils'
import type { Product } from '@/features/products/types/product.types'
import type { SellerProductPayload } from '@/features/seller/api/seller.api'
import type { SellerProductFormParsed } from '@/features/seller/schemas/seller-product.schema'
import { ProductFormModal } from '@/features/seller/components/product-form-modal'
import { ConfirmDeleteModal } from '@/features/seller/components/confirm-delete-modal'
import { SellerProductsToolbar } from '@/features/seller/components/seller-products-toolbar'
import { SellerProductsTable } from '@/features/seller/components/seller-products-table'
import { SellerOrdersHistoryPanel } from '@/features/seller/components/seller-orders-history-panel'
import {
  defaultSellerProductFormValues,
  productToFormValues,
  type SellerProductsFilters,
} from '@/features/seller/components/seller-types'

function buildPayload(form: SellerProductFormParsed): SellerProductPayload {
  const price = Math.round(Number(form.price))
  const discountRaw = form.discountPrice.trim()
  const discountPrice = discountRaw.length > 0 ? Math.round(Number(discountRaw)) : price
  const ratingRaw = form.rating.trim()
  const rating = ratingRaw.length > 0 ? Number(ratingRaw) : 0
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price,
    discountPrice,
    rating,
    stock: Math.round(Number(form.stock)),
    categoryId: Math.round(Number(form.categoryId.trim())),
    brandId: Math.round(Number(form.brandId.trim() || '1')),
    images: [...form.images],
    isFeatured: form.isFeatured,
  }
}

export function SellerDashboardPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const productsQuery = useSellerProductsQuery(Boolean(accessToken))
  const sellerOrdersQuery = useSellerOrderHistoryQuery(Boolean(accessToken))
  const createMutation = useCreateSellerProductMutation()
  const updateMutation = useUpdateSellerProductMutation()
  const deleteMutation = useDeleteSellerProductMutation()
  const uploadImagesMutation = useUploadSellerImagesMutation()
  const updateOrderStatusMutation = useUpdateSellerOrderStatusMutation()
  const realtimeStatus = useSellerOrdersRealtime(Boolean(accessToken))
  const categoriesQuery = useCategoriesQuery()

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [filters, setFilters] = useState<SellerProductsFilters>({
    keyword: '',
    sort: 'newest',
    stockStatus: 'all',
    page: 1,
    pageSize: 10,
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const productsRaw = productsQuery.data ?? []
  const sellerOrders = sellerOrdersQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const totalSoldUnits = useMemo(
    () =>
      sellerOrders.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      ),
    [sellerOrders],
  )

  const filteredProducts = useMemo(() => {
    let rows = [...productsRaw]
    const kw = filters.keyword.trim().toLowerCase()
    if (kw) {
      rows = rows.filter((p) =>
        [p.name, p.description ?? '', p.categoryName ?? '', p.categoryId ?? '']
          .join(' ')
          .toLowerCase()
          .includes(kw),
      )
    }
    if (filters.stockStatus === 'in-stock') {
      rows = rows.filter((p) => (p.stock ?? p.stockQuantity ?? 0) > 0)
    }
    if (filters.stockStatus === 'out-of-stock') {
      rows = rows.filter((p) => (p.stock ?? p.stockQuantity ?? 0) <= 0)
    }
    rows.sort((a, b) => {
      const aPrice = a.price ?? 0
      const bPrice = b.price ?? 0
      const aStock = a.stock ?? a.stockQuantity ?? 0
      const bStock = b.stock ?? b.stockQuantity ?? 0
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      switch (filters.sort) {
        case 'name-asc':
          return aName.localeCompare(bName)
        case 'price-asc':
          return aPrice - bPrice
        case 'price-desc':
          return bPrice - aPrice
        case 'stock-asc':
          return aStock - bStock
        case 'stock-desc':
          return bStock - aStock
        case 'newest':
        default:
          return (new Date(b.createdAt ?? 0).getTime() || 0) - (new Date(a.createdAt ?? 0).getTime() || 0)
      }
    })
    return rows
  }, [productsRaw, filters.keyword, filters.sort, filters.stockStatus])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / filters.pageSize))
  const pagedProducts = useMemo(() => {
    const safePage = Math.min(filters.page, totalPages)
    const start = (safePage - 1) * filters.pageSize
    return filteredProducts.slice(start, start + filters.pageSize)
  }, [filteredProducts, filters.page, filters.pageSize, totalPages])

  const formInitialValues = useMemo(
    () => (editingProduct ? productToFormValues(editingProduct) : defaultSellerProductFormValues),
    [editingProduct],
  )

  function resetFormAndClose() {
    setEditingProduct(null)
    setFormError(null)
    setFormOpen(false)
  }

  function onEdit(product: Product) {
    setEditingProduct(product)
    setFormError(null)
    setFormOpen(true)
    setEditLoading(true)
    void productsApi
      .getById(product.id)
      .then((detail) => setEditingProduct(detail))
      .catch((error) => {
        toast.warning(
          getApiErrorMessage(error, 'Không tải đủ ảnh/mô tả sản phẩm — vẫn dùng dữ liệu tóm tắt.'),
        )
      })
      .finally(() => setEditLoading(false))
  }

  async function onSubmitForm(values: SellerProductFormParsed) {
    setFormError(null)
    const payload = buildPayload(values)
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({ productId: editingProduct.id, payload })
        toast.success('Đã cập nhật sản phẩm.')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Đã tạo sản phẩm mới.')
      }
      resetFormAndClose()
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Không thể lưu sản phẩm.'))
    }
  }

  async function onDeleteConfirmed() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Đã xóa sản phẩm.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xóa sản phẩm.'))
    }
  }

  async function onUploadFiles(files: File[]): Promise<string[]> {
    try {
      const urls = await uploadImagesMutation.mutateAsync(files)
      toast.success('Upload ảnh thành công.')
      return urls
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Upload ảnh thất bại.'))
      return []
    }
  }

  function openCreateModal() {
    setEditingProduct(null)
    setFormError(null)
    setFormOpen(true)
  }

  async function onAdvanceOrderStatus(order: Order, nextStatus: string) {
    try {
      await updateOrderStatusMutation.mutateAsync({ orderId: order.id, status: nextStatus })
      const label = isFulfillmentStatus(nextStatus) ? FULFILLMENT_LABELS[nextStatus] : nextStatus
      toast.success(`Đơn #${order.id}: chuyển sang "${label}".`)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(
          getApiErrorMessage(
            error,
            'Không thể chuyển trạng thái: sai thứ tự hoặc đơn chưa thanh toán.',
          ),
        )
        /** 409 = dữ liệu local lệch với server → đồng bộ lại. */
        void sellerOrdersQuery.refetch()
        return
      }
      toast.error(getApiErrorMessage(error, 'Không cập nhật được trạng thái giao hàng.'))
    }
  }

  function changePage(next: number) {
    if (next < 1 || next > totalPages) return
    setFilters((prev) => ({ ...prev, page: next }))
  }

  const productsErrorText = productsQuery.isError
    ? getApiErrorMessage(productsQuery.error, 'Không tải được sản phẩm của seller.')
    : null
  const ordersErrorText = sellerOrdersQuery.isError
    ? getApiErrorMessage(sellerOrdersQuery.error, 'Không tải được lịch sử đơn của seller.')
    : null

  useEffect(() => {
    if (filters.page > totalPages) {
      setFilters((prev) => ({ ...prev, page: totalPages }))
    }
  }, [filters.page, totalPages])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý sản phẩm</h1>
          <p className="text-sm text-muted-foreground">
            Quản lý danh sách sản phẩm và theo dõi đơn hàng liên quan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal}>Thêm sản phẩm</Button>
          <Link to="/">
            <Button variant="outline">Về trang chủ</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Sản phẩm của tôi</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void productsQuery.refetch()}
              disabled={productsQuery.isFetching}
            >
              {productsQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
          <SellerProductsToolbar filters={filters} onChange={setFilters} />
        </CardHeader>
        <CardContent>
          <SellerProductsTable
            products={pagedProducts}
            isLoading={productsQuery.isPending}
            isError={productsQuery.isError}
            errorText={productsErrorText}
            page={Math.min(filters.page, totalPages)}
            totalPages={totalPages}
            onPageChange={changePage}
            onEdit={onEdit}
            onDelete={(product) => setDeleteTarget(product)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Lịch sử đơn hàng sản phẩm
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  realtimeStatus === 'connected'
                    ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
                    : realtimeStatus === 'connecting'
                      ? 'border-amber-300/60 bg-amber-50 text-amber-700'
                      : 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    realtimeStatus === 'connected'
                      ? 'bg-emerald-500'
                      : realtimeStatus === 'connecting'
                        ? 'animate-pulse bg-amber-500'
                        : 'bg-muted-foreground/50',
                  )}
                  aria-hidden
                />
                {realtimeStatus === 'connected'
                  ? 'Realtime'
                  : realtimeStatus === 'connecting'
                    ? 'Đang kết nối...'
                    : 'Ngoại tuyến'}
              </span>
            </CardTitle>
            <CardDescription>
              Tổng {sellerOrders.length} đơn, đã bán {totalSoldUnits} sản phẩm.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void sellerOrdersQuery.refetch()}
            disabled={sellerOrdersQuery.isFetching}
          >
            {sellerOrdersQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </CardHeader>
        <CardContent>
          <SellerOrdersHistoryPanel
            orders={sellerOrders}
            isLoading={sellerOrdersQuery.isPending}
            isError={sellerOrdersQuery.isError}
            errorText={ordersErrorText}
            updatingOrderId={
              updateOrderStatusMutation.isPending
                ? updateOrderStatusMutation.variables?.orderId ?? null
                : null
            }
            onAdvanceStatus={(order, nextStatus) => void onAdvanceOrderStatus(order, nextStatus)}
          />
        </CardContent>
      </Card>

      <ProductFormModal
        open={formOpen}
        mode={editingProduct ? 'edit' : 'create'}
        initialValues={formInitialValues}
        categories={categories}
        isSubmitting={isSaving}
        isUploading={uploadImagesMutation.isPending}
        isLoading={editLoading}
        error={formError}
        onSubmit={onSubmitForm}
        onClose={resetFormAndClose}
        onUploadFiles={onUploadFiles}
      />
      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Xóa sản phẩm"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.name ?? ''}" không?`}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onDeleteConfirmed()}
      />
    </div>
  )
}
