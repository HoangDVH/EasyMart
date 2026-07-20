import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useCategoriesQuery } from '@/features/products/hooks/use-catalog'
import { productsApi } from '@/features/products/api/products.api'
import type { Product } from '@/features/products/types/product.types'
import type { SellerProductPayload } from '@/features/seller/api/seller.api'
import { ProductFormModal } from '@/features/seller/components/product-form-modal'
import { SellerProductsTable } from '@/features/seller/components/seller-products-table'
import { SellerProductsToolbar } from '@/features/seller/components/seller-products-toolbar'
import { SellerStatsCards } from '@/features/seller/components/seller-stats-cards'
import {
  defaultSellerProductFormValues,
  getProductStock,
  LOW_STOCK_THRESHOLD,
  productToFormValues,
  type SellerProductsFilters,
} from '@/features/seller/components/seller-types'
import {
  useCreateSellerProductMutation,
  useDeleteSellerProductMutation,
  useSellerProductsQuery,
  useUpdateSellerProductMutation,
  useUploadSellerImagesMutation,
} from '@/features/seller/hooks/use-seller'
import type { SellerProductFormParsed } from '@/features/seller/schemas/seller-product.schema'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
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
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(String(deleteTarget.id))
        return next
      })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xóa sản phẩm.'))
    }
  }

  function toggleSelect(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  function toggleSelectPage(productIds: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of productIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  async function onBulkDeleteConfirmed() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkDeleting(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteMutation.mutateAsync(id)))
      const failed = results.filter((result) => result.status === 'rejected').length
      if (failed === 0) {
        toast.success(`Đã xóa ${ids.length} sản phẩm.`)
      } else {
        toast.warning(`Đã xóa ${ids.length - failed}/${ids.length} sản phẩm — ${failed} đơn lỗi.`)
      }
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    } finally {
      setBulkDeleting(false)
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
    <div className="space-y-5">
      <SellerStatsCards
        isLoading={productsQuery.isPending}
        totalProducts={productsRaw.length}
        lowStockCount={attentionStockCount}
        totalOrders={null}
        totalRevenue={null}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Danh sách sản phẩm</h2>
            <p className="text-sm text-muted-foreground">
              {productsQuery.isPending
                ? 'Đang tải…'
                : `${filteredProducts.length} / ${productsRaw.length} sản phẩm`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void productsQuery.refetch()}
              disabled={productsQuery.isFetching}
            >
              <RefreshCw
                className={cn('h-4 w-4', productsQuery.isFetching && 'animate-spin')}
                aria-hidden
              />
              Làm mới
            </Button>
            <Button type="button" className="gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" aria-hidden />
              Thêm sản phẩm
            </Button>
          </div>
        </div>

        <div className="border-b p-4">
          <SellerProductsToolbar filters={filters} onChange={setFilters} counts={stockCounts} />
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary/5 px-4 py-2.5">
            <p className="text-sm">
              Đã chọn <span className="font-semibold tabular-nums">{selectedIds.size}</span> sản phẩm
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
                Bỏ chọn
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Xóa đã chọn
              </Button>
            </div>
          </div>
        ) : null}

        <CardContent className="p-4">
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
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectPage={toggleSelectPage}
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
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa sản phẩm?"
        description={`Sản phẩm "${deleteTarget?.name ?? ''}" sẽ bị xóa và không thể khôi phục.`}
        confirmLabel="Xóa"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onDeleteConfirmed()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xóa nhiều sản phẩm?"
        description={`Bạn sắp xóa ${selectedIds.size} sản phẩm đã chọn. Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa tất cả"
        destructive
        loading={bulkDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void onBulkDeleteConfirmed()}
      />
    </div>
  )
}
