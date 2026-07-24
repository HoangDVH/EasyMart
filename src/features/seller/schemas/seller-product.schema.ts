import { z } from 'zod'

export const sellerProductFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên sản phẩm không được để trống.'),
    description: z.string(),
    price: z
      .string()
      .trim()
      .min(1, 'Giá không được để trống.')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, 'Giá phải là số > 0.'),
    discountPrice: z
      .string()
      .trim()
      .refine(
        (v) => v.length === 0 || (Number.isFinite(Number(v)) && Number(v) > 0),
        'Giá khuyến mãi phải là số > 0.',
      ),
    stock: z
      .string()
      .trim()
      .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, 'Tồn kho phải là số không âm.'),
    categoryId: z.string().trim().min(1, 'Chọn danh mục (API bắt buộc categoryId).'),
    brandId: z.string(),
    isFeatured: z.boolean(),
    images: z.array(z.string()).min(1, 'Cần ít nhất một ảnh sản phẩm (upload mới hoặc giữ ảnh hiện có).'),
  })
  .superRefine((value, ctx) => {
    const price = Number(value.price)
    const discountRaw = value.discountPrice.trim()
    if (discountRaw.length > 0 && Number(discountRaw) >= price) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountPrice'],
        message: 'Giá khuyến mãi phải nhỏ hơn giá gốc.',
      })
    }
  })

export type SellerProductFormParsed = z.infer<typeof sellerProductFormSchema>
