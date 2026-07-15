import { z } from 'zod'

const passwordRules = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
  .regex(/[A-Z]/, 'Mật khẩu cần ít nhất 1 chữ hoa.')
  .regex(/[a-z]/, 'Mật khẩu cần ít nhất 1 chữ thường.')
  .regex(/\d/, 'Mật khẩu cần ít nhất 1 chữ số.')

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Mật khẩu không được để trống.'),
})

export const registerSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: passwordRules,
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
})

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirm'],
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
