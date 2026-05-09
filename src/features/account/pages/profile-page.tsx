import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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

type ProfileFormValues = {
  password: string
  confirm: string
}

export function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const updateMutation = useUpdateMyInfoMutation()
  const profile = profileQuery.data

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({ defaultValues: { password: '', confirm: '' } })

  const password = watch('password')

  useEffect(() => {
    if (!updateMutation.isPending && !isSubmitting) {
      reset({ password: '', confirm: '' })
    }
  }, [updateMutation.isPending, isSubmitting, reset])

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateMutation.mutateAsync({ password: data.password })
      toast.success('Đã cập nhật mật khẩu mới.')
      reset()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu.'))
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
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                {...register('password', {
                  required: 'Mật khẩu mới không được để trống.',
                  minLength: {
                    value: 8,
                    message: 'Mật khẩu phải có ít nhất 8 ký tự.',
                  },
                })}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                {...register('confirm', {
                  required: 'Vui lòng xác nhận mật khẩu.',
                  validate: (value) =>
                    value === password || 'Mật khẩu xác nhận không khớp.',
                })}
              />
              {errors.confirm ? (
                <p className="text-xs text-destructive">{errors.confirm.message}</p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending || isSubmitting}>
                {updateMutation.isPending ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
