import { useState, type ChangeEvent, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Category } from '@/features/products/types/product.types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'
import type { SellerProductFormValues } from '@/features/seller/components/seller-types'

type ProductFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  values: SellerProductFormValues
  categories: Category[]
  isSubmitting: boolean
  isUploading: boolean
  error: string | null
  onChange: (next: SellerProductFormValues) => void
  onSubmit: () => Promise<void>
  onClose: () => void
  onUploadFiles: (files: File[]) => Promise<void>
}

function mergeValues(
  prev: SellerProductFormValues,
  patch: Partial<SellerProductFormValues>,
): SellerProductFormValues {
  return { ...prev, ...patch }
}

export function ProductFormModal({
  open,
  mode,
  values,
  categories,
  isSubmitting,
  isUploading,
  error,
  onChange,
  onSubmit,
  onClose,
  onUploadFiles,
}: ProductFormModalProps) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SellerProductFormValues, string>>>({})

  if (!open) return null

  function validate(next: SellerProductFormValues) {
    const errors: Partial<Record<keyof SellerProductFormValues, string>> = {}
    if (!next.name.trim()) errors.name = 'Tên sản phẩm không được để trống.'
    if (!next.categoryId.trim()) errors.categoryId = 'Chọn danh mục (API bắt buộc categoryId).'
    const price = Number(next.price)
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Giá phải là số > 0.'
    const stock = Number(next.stock)
    if (!Number.isFinite(stock) || stock < 0) errors.stock = 'Tồn kho phải là số không âm.'
    const discountRaw = next.discountPrice.trim()
    if (discountRaw.length > 0) {
      const discount = Number(discountRaw)
      if (!Number.isFinite(discount) || discount <= 0) {
        errors.discountPrice = 'Giá khuyến mãi phải là số > 0.'
      } else if (Number.isFinite(price) && discount >= price) {
        errors.discountPrice = 'Giá khuyến mãi phải nhỏ hơn giá gốc.'
      }
    }
    const ratingRaw = next.rating.trim()
    if (ratingRaw.length > 0) {
      const rating = Number(ratingRaw)
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        errors.rating = 'Đánh giá từ 0 đến 5.'
      }
    }
    return errors
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errors = validate(values)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    await onSubmit()
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    await onUploadFiles(files)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{mode === 'create' ? 'Thêm sản phẩm' : 'Sửa sản phẩm'}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="space-y-4 p-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="seller-product-name">Tên sản phẩm *</Label>
            <Input
              id="seller-product-name"
              value={values.name}
              onChange={(e) => onChange(mergeValues(values, { name: e.target.value }))}
            />
            {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seller-product-description">Mô tả (rich text dạng HTML)</Label>
            <Textarea
              id="seller-product-description"
              value={values.description}
              onChange={(e) => onChange(mergeValues(values, { description: e.target.value }))}
              placeholder="<p>Mô tả sản phẩm...</p>"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-price">Giá *</Label>
              <Input
                id="seller-product-price"
                type="number"
                min={1}
                value={values.price}
                onChange={(e) => onChange(mergeValues(values, { price: e.target.value }))}
              />
              {fieldErrors.price ? <p className="text-xs text-destructive">{fieldErrors.price}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="seller-product-stock">Tồn kho *</Label>
              <Input
                id="seller-product-stock"
                type="number"
                min={0}
                value={values.stock}
                onChange={(e) => onChange(mergeValues(values, { stock: e.target.value }))}
              />
              {fieldErrors.stock ? <p className="text-xs text-destructive">{fieldErrors.stock}</p> : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-discount">Giá khuyến mãi</Label>
              <Input
                id="seller-product-discount"
                type="number"
                min={1}
                value={values.discountPrice}
                onChange={(e) => onChange(mergeValues(values, { discountPrice: e.target.value }))}
                placeholder="Để trống nếu không giảm giá"
              />
              {fieldErrors.discountPrice ? (
                <p className="text-xs text-destructive">{fieldErrors.discountPrice}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="seller-product-rating">Đánh giá (0–5)</Label>
              <Input
                id="seller-product-rating"
                type="number"
                min={0}
                max={5}
                step="0.1"
                value={values.rating}
                onChange={(e) => onChange(mergeValues(values, { rating: e.target.value }))}
                placeholder="Ví dụ: 4.5"
              />
              {fieldErrors.rating ? <p className="text-xs text-destructive">{fieldErrors.rating}</p> : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-category">Danh mục *</Label>
              <Select
                id="seller-product-category"
                value={values.categoryId}
                onChange={(e) => onChange(mergeValues(values, { categoryId: e.target.value }))}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {fieldErrors.categoryId ? (
                <p className="text-xs text-destructive">{fieldErrors.categoryId}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="seller-product-brand">Brand ID</Label>
              <Input
                id="seller-product-brand"
                value={values.brandId}
                onChange={(e) => onChange(mergeValues(values, { brandId: e.target.value }))}
                placeholder="Mặc định 1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="seller-product-featured"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={values.isFeatured}
              onChange={(e) => onChange(mergeValues(values, { isFeatured: e.target.checked }))}
            />
            <Label htmlFor="seller-product-featured" className="font-normal">
              Sản phẩm nổi bật (isFeatured)
            </Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seller-product-images">Upload ảnh</Label>
            <Input
              id="seller-product-images"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void handleFiles(e)}
              disabled={isUploading}
            />
            {values.images.length > 0 ? (
              <p className="text-xs text-muted-foreground">Đã upload {values.images.length} ảnh.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Có thể để trống nếu API chấp nhận mảng ảnh rỗng; nếu lỗi, hãy upload ít nhất một ảnh.
              </p>
            )}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo sản phẩm' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
