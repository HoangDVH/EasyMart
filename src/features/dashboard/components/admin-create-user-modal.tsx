import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import {
  adminCreateUserSchema,
  type AdminCreateUserFormValues,
} from '@/features/dashboard/schemas/admin.schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type AdminCreateUserModalProps = {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: AdminCreateUserFormValues) => Promise<void>
}

export function AdminCreateUserModal({
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: AdminCreateUserModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<AdminCreateUserFormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (open) reset({ email: '', password: '' })
  }, [open, reset])

  if (!open) return null

  const submit = async (data: AdminCreateUserFormValues) => {
    await onSubmit(data)
    reset()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div
        className="w-full max-w-md rounded-xl border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-user-title"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 id="admin-create-user-title" className="text-base font-semibold">
            Thêm người dùng
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form className="space-y-4 p-4" onSubmit={handleSubmit(submit)}>
          <p className="text-sm text-muted-foreground">
            Tạo tài khoản mới. Sau đó có thể gán quyền trực tiếp trong danh sách.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="admin-create-email">Email</Label>
            <Input
              id="admin-create-email"
              type="email"
              autoComplete="off"
              placeholder="nguoidung@email.com"
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-create-password">Mật khẩu tạm</Label>
            <Input
              id="admin-create-password"
              type="password"
              autoComplete="new-password"
              placeholder="Tối thiểu 8 ký tự"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
