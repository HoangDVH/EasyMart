import { useState } from 'react'
import { toast } from 'react-toastify'
import { KeyRound } from 'lucide-react'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { useUpdateMyInfoMutation } from '@/features/account/hooks/use-users'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'

export function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const updateMutation = useUpdateMyInfoMutation()
  const profile = profileQuery.data

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < 8
  const passwordMismatch = confirm.length > 0 && confirm !== password
  const canSubmit =
    !submitting &&
    !updateMutation.isPending &&
    password.length >= 8 &&
    confirm === password

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await updateMutation.mutateAsync({ password })
      toast.success('Đã cập nhật mật khẩu mới.')
      setPassword('')
      setConfirm('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hồ sơ tài khoản</CardTitle>
          <CardDescription>Email của tài khoản đang đăng nhập.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Email
              </Label>
              <p className="text-sm font-medium">{profile?.email ?? '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Đổi mật khẩu
          </CardTitle>
          <CardDescription>
            Mật khẩu mới tối thiểu 8 ký tự. Sau khi đổi, hãy đăng nhập lại nếu cần.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                minLength={8}
                required
              />
              {passwordTooShort ? (
                <p className="text-xs text-destructive">
                  Mật khẩu phải có ít nhất 8 ký tự.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                minLength={8}
                required
              />
              {passwordMismatch ? (
                <p className="text-xs text-destructive">
                  Mật khẩu xác nhận không khớp.
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit}>
                {updateMutation.isPending ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
