import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginMutation = useLoginMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [showLoggedOutBanner] = useState(
    () => (location.state as { loggedOut?: boolean } | null)?.loggedOut === true,
  )
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!showLoggedOutBanner) return
    toast.success('Đã đăng xuất thành công.')
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} })
  }, [showLoggedOutBanner, location.pathname, location.search, navigate])

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginMutation.mutateAsync(data)
      toast.success('Đăng nhập thành công!')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Vui lòng kiểm tra lại email hoặc mật khẩu.'),
      )
      return
    }

    const redirect = resolvePostLoginPath(
      location.search,
      location.state?.from?.pathname,
    )
    navigate(redirect, { replace: true })
  }

  return (
    <>
      {showLoggedOutBanner ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium">Đã đăng xuất thành công</p>
            <p className="mt-0.5 text-emerald-800/90">Bạn có thể đăng nhập lại bất cứ lúc nào.</p>
          </div>
        </div>
      ) : null}
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
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link className="text-primary underline" to={`/auth/register${location.search}`}>
                Đăng ký
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
