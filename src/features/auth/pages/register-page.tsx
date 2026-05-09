import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useRegisterMutation } from '@/features/auth/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { toast } from 'react-toastify'
import { Eye, EyeOff } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự.')
    .regex(/[A-Z]/, 'Mật khẩu cần ít nhất 1 chữ hoa.')
    .regex(/[a-z]/, 'Mật khẩu cần ít nhất 1 chữ thường.')
    .regex(/\d/, 'Mật khẩu cần ít nhất 1 chữ số.'),
})

export function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegisterMutation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = registerSchema.safeParse(form)
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors
      setFieldErrors({
        email: flattened.email?.[0],
        password: flattened.password?.[0],
      })
      return
    }
    setFieldErrors({})
    try {
      await registerMutation.mutateAsync(parsed.data)
      toast.success('Đăng ký thành công. Đang chuyển tới đăng nhập…')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Vui lòng kiểm tra dữ liệu đầu vào.'))
      return
    }
    window.setTimeout(() => {
      navigate('/auth/login', { replace: true })
    }, 400)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký</CardTitle>
        <CardDescription>Tạo tài khoản mới để bắt đầu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Đang xử lý...' : 'Đăng ký'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Đã có tài khoản? <Link className="text-primary underline" to="/auth/login">Đăng nhập</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
