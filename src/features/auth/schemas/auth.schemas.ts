import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Mật khẩu không được để trống.'),
})

export const registerSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
    .regex(/[A-Z]/, 'Mật khẩu cần ít nhất 1 chữ hoa.')
    .regex(/[a-z]/, 'Mật khẩu cần ít nhất 1 chữ thường.')
    .regex(/\d/, 'Mật khẩu cần ít nhất 1 chữ số.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
