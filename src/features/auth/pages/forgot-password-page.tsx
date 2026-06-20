import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Mail } from 'lucide-react'
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
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error('Vui lòng nhập email.')
      return
    }
    setSubmitted(true)
    toast.info(
      'Tính năng khôi phục mật khẩu qua email đang được triển khai. Vui lòng liên hệ support@easymart.vn.',
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quên mật khẩu</CardTitle>
        <CardDescription>
          Nhập email đã đăng ký. Khi hệ thống email reset sẵn sàng, bạn sẽ nhận link đặt lại mật khẩu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4 text-sm">
            <p className="rounded-lg border bg-muted/30 p-3 text-muted-foreground">
              Đã ghi nhận yêu cầu cho <strong className="text-foreground">{email.trim()}</strong>.
              Hiện backend chưa hỗ trợ gửi email — liên hệ{' '}
              <a href="mailto:support@easymart.vn" className="text-primary underline">
                support@easymart.vn
              </a>{' '}
              để được hỗ trợ.
            </p>
            <Link to="/auth/login">
              <Button className="w-full">Quay lại đăng nhập</Button>
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Gửi yêu cầu
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link className="text-primary underline" to="/auth/login">
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
