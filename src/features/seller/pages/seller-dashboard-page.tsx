import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useCategoriesQuery } from '@/features/products/hooks/use-catalog'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  useCreateSellerProductMutation,
  useDeleteSellerProductMutation,
  useSellerOrderHistoryQuery,
  useSellerProductsQuery,
  useUpdateSellerProductMutation,
  useUploadSellerImagesMutation,
} from '@/features/seller/hooks/use-seller'
import type { Product } from '@/features/products/types/product.types'
import type { SellerProductPayload } from '@/features/seller/api/seller.api'
import { ProductFormModal } from '@/features/seller/components/product-form-modal'
import { ConfirmDeleteModal } from '@/features/seller/components/confirm-delete-modal'
import { SellerProductsToolbar } from '@/features/seller/components/seller-products-toolbar'
import { SellerProductsTable } from '@/features/seller/components/seller-products-table'
import { SellerOrdersHistoryPanel } from '@/features/seller/components/seller-orders-history-panel'
import {
  defaultSellerProductFormValues,
  productToFormValues,
  type SellerProductFormValues,
  type SellerProductsFilters,
} from '@/features/seller/components/seller-types'

function buildPayload(form: SellerProductFormValues): SellerProductPayload {
  const price = Math.round(Number(form.price))
  const discountRaw = form.discountPrice.trim()
  const discountPrice = discountRaw.length > 0 ? Math.round(Number(discountRaw)) : price
  const ratingRaw = form.rating.trim()
  const rating = ratingRaw.length > 0 ? Number(ratingRaw) : 0
  return {
    name: form.name.trim(),
    ...(form.description.trim().length > 0 ? { description: form.description.trim() } : {}),
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
  const categoriesQuery = useCategoriesQuery()

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<SellerProductFormValues>(defaultSellerProductFormValues)
  const [formError, setFormError] = useState<string | null>(null)
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

  function resetFormAndClose() {
    setEditingProduct(null)
    setForm(defaultSellerProductFormValues)
    setFormError(null)
    setFormOpen(false)
  }

  function onEdit(product: Product) {
    setEditingProduct(product)
    setForm(productToFormValues(product))
    setFormError(null)
    setFormOpen(true)
  }

  async function onSubmitForm() {
    setFormError(null)
    const payload = buildPayload(form)
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

  async function onUploadFiles(files: File[]) {
    try {
      const urls = await uploadImagesMutation.mutateAsync(files)
      setForm((prev) => ({ ...prev, images: Array.from(new Set([...prev.images, ...urls])) }))
      toast.success('Upload ảnh thành công.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Upload ảnh thất bại.'))
    }
  }

  function openCreateModal() {
    setEditingProduct(null)
    setForm(defaultSellerProductFormValues)
    setFormError(null)
    setFormOpen(true)
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
          <h1 className="text-2xl font-semibold tracking-tight">Quản lí sản phẩm</h1>
          <p className="text-sm text-muted-foreground">
            Quản lí danh sách sản phẩm và theo dõi đơn hàng liên quan.
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
            <CardTitle>Lịch sử đơn hàng sản phẩm</CardTitle>
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
          />
        </CardContent>
      </Card>

      <ProductFormModal
        open={formOpen}
        mode={editingProduct ? 'edit' : 'create'}
        values={form}
        categories={categories}
        isSubmitting={isSaving}
        isUploading={uploadImagesMutation.isPending}
        error={formError}
        onChange={setForm}
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
