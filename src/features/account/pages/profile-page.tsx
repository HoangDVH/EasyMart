import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { KeyRound, MapPin, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { useUpdateMyInfoMutation } from '@/features/account/hooks/use-users'
import {
  changePasswordSchema,
  profileInfoSchema,
  type ChangePasswordFormValues,
  type ProfileInfoFormValues,
} from '@/features/account/schemas/profile.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'

export function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const updateMutation = useUpdateMyInfoMutation()
  const profile = profileQuery.data
  const [savingProfile, setSavingProfile] = useState(false)

  const profileForm = useForm<ProfileInfoFormValues>({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  useEffect(() => {
    if (!profile) return
    profileForm.reset({
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
    })
  }, [profile, profileForm])

  useEffect(() => {
    if (!updateMutation.isPending && !passwordForm.formState.isSubmitting) {
      passwordForm.reset({ password: '', confirm: '' })
    }
  }, [updateMutation.isPending, passwordForm])

  const onSaveProfile = async (data: ProfileInfoFormValues) => {
    setSavingProfile(true)
    try {
      await updateMutation.mutateAsync({
        fullName: data.fullName.trim() || undefined,
        phone: data.phone.trim() || undefined,
      })
      toast.success('Đã cập nhật hồ sơ.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được hồ sơ.'))
    } finally {
      setSavingProfile(false)
    }
  }

  const onChangePassword = async (data: ChangePasswordFormValues) => {
    try {
      await updateMutation.mutateAsync({ password: data.password })
      toast.success('Đã cập nhật mật khẩu mới.')
      passwordForm.reset()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu.'))
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Hồ sơ tài khoản
            </CardTitle>
            <CardDescription>Thông tin dùng để giao hàng và liên hệ.</CardDescription>
          </div>
          <Link
            to="/account/addresses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <MapPin className="h-4 w-4" aria-hidden />
            Sổ địa chỉ
          </Link>
        </CardHeader>
        <CardContent>
          {profileQuery.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={profileForm.handleSubmit(onSaveProfile)}>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <p className="text-sm font-medium">{profile?.email ?? '—'}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-full-name">Họ và tên</Label>
                <Input
                  id="profile-full-name"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  {...profileForm.register('fullName')}
                />
                {profileForm.formState.errors.fullName ? (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">Số điện thoại</Label>
                <Input
                  id="profile-phone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0901234567"
                  {...profileForm.register('phone')}
                />
                {profileForm.formState.errors.phone ? (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.phone.message}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={savingProfile || updateMutation.isPending}>
                  {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </Button>
              </div>
            </form>
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
          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                {...passwordForm.register('password')}
              />
              {passwordForm.formState.errors.password ? (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                {...passwordForm.register('confirm')}
              />
              {passwordForm.formState.errors.confirm ? (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.confirm.message}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending || passwordForm.formState.isSubmitting}
              >
                {updateMutation.isPending && !savingProfile
                  ? 'Đang lưu...'
                  : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
