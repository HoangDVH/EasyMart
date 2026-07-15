import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { useResetPasswordMutation } from '@/features/auth/hooks/use-auth'
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas/auth.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { zodResolver } from '@hookform/resolvers/zod'
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

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const resetPassword = useResetPasswordMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  if (!token) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Link không hợp lệ</CardTitle>
          <CardDescription>
            Link đặt lại mật khẩu thiếu hoặc đã hết hạn. Vui lòng yêu cầu link mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to="/auth/forgot-password">
            <Button className="w-full">Yêu cầu link mới</Button>
          </Link>
          <Link to="/auth/login" className="block text-center text-sm text-primary underline">
            Quay lại đăng nhập
          </Link>
        </CardContent>
      </Card>
    )
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await resetPassword.mutateAsync({ token, newPassword: data.password })
      toast.success('Đã đặt lại mật khẩu. Bạn có thể đăng nhập ngay.')
      navigate('/auth/login', { replace: true })
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Không đặt lại được mật khẩu. Link có thể đã hết hạn.'),
      )
    }
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Đặt lại mật khẩu</CardTitle>
        <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="reset-password">Mật khẩu mới</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pl-9 pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Xác nhận mật khẩu</Label>
            <div className="relative">
              <Input
                id="reset-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                {...register('confirm')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm ? (
              <p className="text-xs text-destructive">{errors.confirm.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || resetPassword.isPending}>
            {isSubmitting || resetPassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Cập nhật mật khẩu
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
