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
