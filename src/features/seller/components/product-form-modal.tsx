import { useEffect, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import type { Category } from '@/features/products/types/product.types'
import type { SellerProductFormValues } from '@/features/seller/components/seller-types'
import {
  sellerProductFormSchema,
  type SellerProductFormParsed,
} from '@/features/seller/schemas/seller-product.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

type ProductFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initialValues: SellerProductFormValues
  categories: Category[]
  isSubmitting: boolean
  isUploading: boolean
  error: string | null
  onSubmit: (values: SellerProductFormParsed) => Promise<void>
  onClose: () => void
  onUploadFiles: (files: File[]) => Promise<string[]>
}

export function ProductFormModal({
  open,
  mode,
  initialValues,
  categories,
  isSubmitting,
  isUploading,
  error,
  onSubmit,
  onClose,
  onUploadFiles,
}: ProductFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SellerProductFormValues>({
    resolver: zodResolver(sellerProductFormSchema),
    defaultValues: initialValues,
  })

  const images = watch('images')

  useEffect(() => {
    if (open) reset(initialValues)
  }, [open, initialValues, reset])

  if (!open) return null

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const uploaded = await onUploadFiles(files)
    if (uploaded.length > 0) {
      setValue('images', [...images, ...uploaded], { shouldValidate: true })
    }
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
        <form className="space-y-4 p-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="seller-product-name">Tên sản phẩm *</Label>
            <Input id="seller-product-name" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="seller-product-description">Mô tả (rich text dạng HTML)</Label>
            <Textarea
              id="seller-product-description"
              {...register('description')}
              placeholder="<p>Mô tả sản phẩm...</p>"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-price">Giá *</Label>
              <Input id="seller-product-price" type="number" min={1} {...register('price')} />
              {errors.price ? <p className="text-xs text-destructive">{errors.price.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="seller-product-stock">Tồn kho *</Label>
              <Input id="seller-product-stock" type="number" min={0} {...register('stock')} />
              {errors.stock ? <p className="text-xs text-destructive">{errors.stock.message}</p> : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-discount">Giá khuyến mãi</Label>
              <Input
                id="seller-product-discount"
                type="number"
                min={1}
                {...register('discountPrice')}
                placeholder="Để trống nếu không giảm giá"
              />
              {errors.discountPrice ? (
                <p className="text-xs text-destructive">{errors.discountPrice.message}</p>
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
                {...register('rating')}
                placeholder="Ví dụ: 4.5"
              />
              {errors.rating ? <p className="text-xs text-destructive">{errors.rating.message}</p> : null}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="seller-product-category">Danh mục *</Label>
              <Select id="seller-product-category" {...register('categoryId')}>
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId ? (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="seller-product-brand">Brand ID</Label>
              <Input
                id="seller-product-brand"
                {...register('brandId')}
                placeholder="Mặc định 1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="seller-product-featured"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              {...register('isFeatured')}
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
            {images.length > 0 ? (
              <p className="text-xs text-muted-foreground">Đã upload {images.length} ảnh.</p>
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
