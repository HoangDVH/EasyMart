import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useLoginMutation } from '@/features/auth/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { toast } from 'react-toastify'
import { Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().trim().email('Email không hợp lệ.'),
  password: z.string().min(1, 'Mật khẩu không được để trống.'),
})

type LoginFormValues = {
  email: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ defaultValues: { email: '', password: '' } })

  const onSubmit = async (data: LoginFormValues) => {
    const parsed = loginSchema.safeParse(data)
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors
      if (flattened.email?.[0]) {
        setError('email', { type: 'manual', message: flattened.email?.[0] })
      }
      if (flattened.password?.[0]) {
        setError('password', { type: 'manual', message: flattened.password?.[0] })
      }
      return
    }

    try {
      await loginMutation.mutateAsync(parsed.data)
      toast.success('Đăng nhập thành công!')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Vui lòng kiểm tra lại email hoặc mật khẩu.'))
      return
    }

    const redirect = location.state?.from?.pathname ?? '/'
    navigate(redirect, { replace: true })
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Sử dụng tài khoản để truy cập hệ thống.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              required
            />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
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
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Đang xử lý...' : 'Đăng nhập'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Chưa có tài khoản? <Link className="text-primary underline" to="/auth/register">Đăng ký</Link>
          </p>
        </form>
      </CardContent>
    </Card>
    {loginMutation.isPending ? <FullPageSpinner message="Đang đăng nhập..." /> : null}
    </>
  )
}
