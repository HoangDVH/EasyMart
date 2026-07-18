import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Loader2, Mail } from 'lucide-react'
import { useForgotPasswordMutation } from '@/features/auth/hooks/use-auth'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
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

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPasswordMutation()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const isBusy = isSubmitting || forgotPassword.isPending

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await forgotPassword.mutateAsync(data.email.trim())
      setSubmittedEmail(data.email.trim())
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Không gửi được yêu cầu. Máy chủ có thể đang khởi động — thử lại sau vài giây.',
        ),
      )
    }
  }

  if (submittedEmail) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Kiểm tra email của bạn</CardTitle>
          <CardDescription>
            Nếu email đã đăng ký tài khoản, bạn sẽ nhận link đặt lại mật khẩu trong vài phút.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
            Đã gửi yêu cầu cho <strong className="text-foreground">{submittedEmail}</strong>.
            Hãy kiểm tra hộp thư (và cả thư mục spam). Link có hiệu lực trong 30 phút.
          </p>
          <Link to="/auth/login">
            <Button className="w-full">Quay lại đăng nhập</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Quên mật khẩu</CardTitle>
        <CardDescription>
          Nhập email đã đăng ký. Chúng tôi sẽ gửi link đặt lại mật khẩu nếu tài khoản tồn tại.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                className="pl-9"
                placeholder="you@example.com"
                {...register('email')}
              />
            </div>
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isBusy ? 'Đang gửi email...' : 'Gửi link đặt lại mật khẩu'}
          </Button>
          {isBusy ? (
            <p className="text-center text-xs text-muted-foreground">
              Máy chủ có thể mất 15–45 giây lần đầu (khởi động + gửi Gmail). Vui lòng đợi.
            </p>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            <Link className="text-primary underline" to="/auth/login">
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
