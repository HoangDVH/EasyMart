import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { CheckCircle2, KeyRound, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { isGoogleAvatarUrl } from '@/features/auth/lib/user-display'
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
import { UserAvatar } from '@/shared/ui/user-avatar'

function roleLabel(role: string | undefined) {
  if (role === 'ADMIN') return 'Quản trị viên'
  if (role === 'SELLER') return 'Người bán'
  return 'Khách hàng'
}

export function ProfilePage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const updateMutation = useUpdateMyInfoMutation()
  const profile = profileQuery.data
  const [savingProfile, setSavingProfile] = useState(false)

  const linkedGoogle = isGoogleAvatarUrl(profile?.avatarUrl)
  const displayName = profile?.fullName?.trim() || profile?.email || 'Người dùng EasyMart'

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
      toast.success(linkedGoogle ? 'Đã đặt mật khẩu cho tài khoản.' : 'Đã cập nhật mật khẩu mới.')
      passwordForm.reset()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu.'))
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {profileQuery.isPending ? (
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
              <div className="space-y-2 pt-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <UserAvatar
                  fullName={profile?.fullName}
                  email={profile?.email}
                  avatarUrl={profile?.avatarUrl}
                  size="lg"
                  showGoogleBadge={linkedGoogle}
                />
                <div className="min-w-0 space-y-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
                      {displayName}
                    </h1>
                    {linkedGoogle ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
                        Đã xác minh Google
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel(profile?.role)}</p>
                </div>
              </div>
              <Link
                to="/account/addresses"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                Sổ địa chỉ
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
          <CardDescription>Dùng khi đặt hàng và giao nhận.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileQuery.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={profileForm.handleSubmit(onSaveProfile)}>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
                </Label>
                <p className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm font-medium">
                  {profile?.email ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">Email không thể đổi tại đây.</p>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5 text-primary" />
            {linkedGoogle ? 'Mật khẩu (tuỳ chọn)' : 'Đổi mật khẩu'}
          </CardTitle>
          <CardDescription>
            {linkedGoogle
              ? 'Bạn đang đăng nhập bằng Google. Có thể đặt thêm mật khẩu để đăng nhập bằng email khi cần.'
              : 'Mật khẩu mới tối thiểu 8 ký tự. Sau khi đổi, hãy đăng nhập lại nếu cần.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <div className="space-y-2">
              <Label htmlFor="new-password">
                {linkedGoogle ? 'Đặt mật khẩu' : 'Mật khẩu mới'}
              </Label>
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
                placeholder="Nhập lại mật khẩu"
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
                  : linkedGoogle
                    ? 'Lưu mật khẩu'
                    : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
