import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api/auth.api'
import { useLoginMutation } from '@/features/auth/hooks/use-auth'
import {
  loginSchema,
  type LoginFormValues,
} from '@/features/auth/schemas/auth.schemas'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { resolvePostLoginPath } from '@/shared/lib/auth-redirect'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthGoogleSection } from '@/features/auth/components/google-sign-in-button'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data)
      const profile = await authApi.getProfile()
      toast.success('Đăng nhập thành công!')
      const redirect = resolvePostLoginPath(
        location.search,
        (location.state as { from?: { pathname: string; search?: string; hash?: string } } | null)
          ?.from,
        profile.role,
      )
      navigate(redirect, { replace: true })
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Vui lòng kiểm tra lại email hoặc mật khẩu.'),
      )
    }
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>
          Sử dụng tài khoản để truy cập hệ thống.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email ? (
              <p className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <Link
              className="text-xs text-primary underline-offset-2 hover:underline"
              to={`/auth/forgot-password${location.search}`}
            >
              Quên mật khẩu?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loginMutation.isPending || isSubmitting}
          >
            {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loginMutation.isPending ? 'Đang xử lý...' : 'Đăng nhập'}
          </Button>
          <AuthGoogleSection
            context="signin"
            successMessage="Đăng nhập Google thành công!"
            disabled={loginMutation.isPending || isSubmitting}
          />
          <p className="text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link className="text-primary underline" to={`/auth/register${location.search}`}>
              Đăng ký
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
