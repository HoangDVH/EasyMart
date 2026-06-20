import { z } from 'zod'

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .regex(/^[0-9+\s-]{8,15}$/, 'Số điện thoại không hợp lệ.'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ nhận hàng.'),
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>
