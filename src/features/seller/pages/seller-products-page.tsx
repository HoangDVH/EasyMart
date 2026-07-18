import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
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
  useSellerProductsQuery,
  useUpdateSellerProductMutation,
  useUploadSellerImagesMutation,
} from '@/features/seller/hooks/use-seller'
import { cn } from '@/shared/lib/utils'
import type { Product } from '@/features/products/types/product.types'
import type { SellerProductPayload } from '@/features/seller/api/seller.api'
import type { SellerProductFormParsed } from '@/features/seller/schemas/seller-product.schema'
import { ProductFormModal } from '@/features/seller/components/product-form-modal'
import { ConfirmDeleteModal } from '@/features/seller/components/confirm-delete-modal'
import { SellerProductsToolbar } from '@/features/seller/components/seller-products-toolbar'
import { SellerProductsTable } from '@/features/seller/components/seller-products-table'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'
import {
  defaultSellerProductFormValues,
  getProductStock,
  LOW_STOCK_THRESHOLD,
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

export function SellerProductsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const productsQuery = useSellerProductsQuery(Boolean(accessToken))
  const createMutation = useCreateSellerProductMutation()
  const updateMutation = useUpdateSellerProductMutation()
  const deleteMutation = useDeleteSellerProductMutation()
  const uploadImagesMutation = useUploadSellerImagesMutation()
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
  const categories = categoriesQuery.data ?? []

  const attentionStockCount = useMemo(
    () =>
      productsRaw.reduce(
        (count, p) => (getProductStock(p) <= LOW_STOCK_THRESHOLD ? count + 1 : count),
        0,
      ),
    [productsRaw],
  )

  const searchedProducts = useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase()
    if (!kw) return productsRaw
    return productsRaw.filter((p) =>
      [p.name, p.description ?? '', p.categoryName ?? '', p.categoryId ?? '']
        .join(' ')
        .toLowerCase()
        .includes(kw),
    )
  }, [productsRaw, filters.keyword])

  const stockCounts = useMemo(() => {
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    for (const p of searchedProducts) {
      const stock = getProductStock(p)
      if (stock <= 0) outOfStock += 1
      else if (stock <= LOW_STOCK_THRESHOLD) lowStock += 1
      else inStock += 1
    }
    return {
      all: searchedProducts.length,
      'in-stock': inStock,
      'low-stock': lowStock,
      'out-of-stock': outOfStock,
    }
  }, [searchedProducts])

  const filteredProducts = useMemo(() => {
    let rows = [...searchedProducts]
    if (filters.stockStatus === 'in-stock') {
      rows = rows.filter((p) => getProductStock(p) > LOW_STOCK_THRESHOLD)
    }
    if (filters.stockStatus === 'low-stock') {
      rows = rows.filter((p) => {
        const stock = getProductStock(p)
        return stock > 0 && stock <= LOW_STOCK_THRESHOLD
      })
    }
    if (filters.stockStatus === 'out-of-stock') {
      rows = rows.filter((p) => getProductStock(p) <= 0)
    }
    rows.sort((a, b) => {
      const aPrice = a.price ?? 0
      const bPrice = b.price ?? 0
      const aStock = getProductStock(a)
      const bStock = getProductStock(b)
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
  }, [searchedProducts, filters.sort, filters.stockStatus])

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

  function changePage(next: number) {
    if (next < 1 || next > totalPages) return
    setFilters((prev) => ({ ...prev, page: next }))
  }

  const productsErrorText = productsQuery.isError
    ? getApiErrorMessage(productsQuery.error, 'Không tải được sản phẩm của seller.')
    : null

  useEffect(() => {
    if (filters.page > totalPages) {
      setFilters((prev) => ({ ...prev, page: totalPages }))
    }
  }, [filters.page, totalPages])

  return (
    <div className="space-y-4">
      <SellerStatsCards
        isLoading={productsQuery.isPending}
        totalProducts={productsRaw.length}
        lowStockCount={attentionStockCount}
        totalOrders={null}
        totalRevenue={null}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Danh sách sản phẩm</CardTitle>
              <CardDescription>{productsRaw.length} sản phẩm trong cửa hàng.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void productsQuery.refetch()}
                disabled={productsQuery.isFetching}
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', productsQuery.isFetching && 'animate-spin')}
                />
                {productsQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
              </Button>
              <Button size="sm" onClick={openCreateModal} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>
          </div>
          <SellerProductsToolbar filters={filters} onChange={setFilters} counts={stockCounts} />
        </CardHeader>
        <CardContent>
          <SellerProductsTable
            products={pagedProducts}
            isLoading={productsQuery.isPending}
            isError={productsQuery.isError}
            errorText={productsErrorText}
            page={Math.min(filters.page, totalPages)}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            onPageChange={changePage}
            onEdit={onEdit}
            onDelete={(product) => setDeleteTarget(product)}
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
