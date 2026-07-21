import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import {
  adminResetPasswordSchema,
  type AdminResetPasswordFormValues,
} from '@/features/dashboard/schemas/admin.schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type AdminResetPasswordModalProps = {
  open: boolean
  email: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}

export function AdminResetPasswordModal({
  open,
  email,
  isSubmitting,
  onClose,
  onSubmit,
}: AdminResetPasswordModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<AdminResetPasswordFormValues>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  useEffect(() => {
    if (open) reset({ password: '', confirm: '' })
  }, [open, reset])

  if (!open) return null

  const submit = async (data: AdminResetPasswordFormValues) => {
    await onSubmit(data.password)
    reset()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">Đặt lại mật khẩu</h3>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 p-0"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="space-y-4 p-4" onSubmit={handleSubmit(submit)}>
          <p className="text-sm text-muted-foreground">
            Đặt mật khẩu mới cho <strong>{email}</strong>
          </p>
          <div className="grid gap-2">
            <Label htmlFor="admin-reset-password">Mật khẩu mới</Label>
            <Input
              id="admin-reset-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-reset-confirm">Xác nhận mật khẩu</Label>
            <Input
              id="admin-reset-confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
            {errors.confirm ? (
              <p className="text-xs text-destructive">{errors.confirm.message}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
