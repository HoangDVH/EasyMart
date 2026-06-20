import { z } from 'zod'

export const adminCreateUserSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự.'),
})

export const adminResetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự.'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirm'],
  })

export type AdminCreateUserFormValues = z.infer<typeof adminCreateUserSchema>
export type AdminResetPasswordFormValues = z.infer<typeof adminResetPasswordSchema>
