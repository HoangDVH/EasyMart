import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import {
  userAddressSchema,
  type UserAddressFormValues,
} from '@/features/account/schemas/profile.schemas'
import type { UserAddress } from '@/features/account/api/addresses.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

type AddressFormModalProps = {
  open: boolean
  editing: UserAddress | null
  /** Địa chỉ đầu tiên → mặc định bật isDefault */
  defaultAsFirst?: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: UserAddressFormValues) => Promise<void>
}

export function AddressFormModal({
  open,
  editing,
  defaultAsFirst = false,
  isSubmitting,
  onClose,
  onSubmit,
}: AddressFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<UserAddressFormValues>({
    resolver: zodResolver(userAddressSchema),
    defaultValues: {
      label: '',
      receiverName: '',
      phone: '',
      address: '',
      isDefault: false,
    },
  })

  const isDefault = watch('isDefault')

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        label: editing.label ?? '',
        receiverName: editing.receiverName,
        phone: editing.phone,
        address: editing.address,
        isDefault: editing.isDefault,
      })
    } else {
      reset({
        label: '',
        receiverName: '',
        phone: '',
        address: '',
        isDefault: defaultAsFirst,
      })
    }
  }, [open, editing, defaultAsFirst, reset])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl border bg-background shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-form-title"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 id="address-form-title" className="text-base font-semibold">
            {editing ? 'Cập nhật địa chỉ' : 'Địa chỉ mới'}
          </h3>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Đóng"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="space-y-3 overflow-y-auto p-4"
          onSubmit={handleSubmit(async (data) => {
            await onSubmit(data)
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="addr-label">Nhãn (tuỳ chọn)</Label>
            <Input id="addr-label" placeholder="Nhà, Công ty…" {...register('label')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-name">Họ và tên</Label>
            <Input id="addr-name" autoComplete="name" {...register('receiverName')} />
            {errors.receiverName ? (
              <p className="text-xs text-destructive">{errors.receiverName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-phone">Số điện thoại</Label>
            <Input id="addr-phone" inputMode="tel" autoComplete="tel" {...register('phone')} />
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-address">Địa chỉ cụ thể</Label>
            <Textarea
              id="addr-address"
              rows={3}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
              {...register('address')}
            />
            {errors.address ? (
              <p className="text-xs text-destructive">{errors.address.message}</p>
            ) : null}
          </div>
          <label className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={Boolean(isDefault)}
              onChange={(e) => setValue('isDefault', e.target.checked)}
            />
            Đặt làm địa chỉ mặc định
          </label>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting || isFormSubmitting}
            >
              Trở lại
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || isFormSubmitting}>
              {isSubmitting || isFormSubmitting ? 'Đang lưu...' : 'Hoàn thành'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
