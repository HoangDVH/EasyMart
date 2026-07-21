import { z } from 'zod'

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirm'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const profileInfoSchema = z.object({
  fullName: z.string().trim().max(255, 'Họ tên tối đa 255 ký tự.'),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[0-9+\s-]{8,15}$/.test(v),
      'Số điện thoại không hợp lệ.',
    ),
})

export type ProfileInfoFormValues = z.infer<typeof profileInfoSchema>

export const userAddressSchema = z.object({
  label: z.string().trim().max(100, 'Nhãn tối đa 100 ký tự.').optional().or(z.literal('')),
  receiverName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.').max(255),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại.')
    .regex(/^[0-9+\s-]{8,15}$/, 'Số điện thoại không hợp lệ.'),
  address: z.string().trim().min(1, 'Vui lòng nhập địa chỉ.').max(1000),
  isDefault: z.boolean().optional(),
})

export type UserAddressFormValues = z.infer<typeof userAddressSchema>
