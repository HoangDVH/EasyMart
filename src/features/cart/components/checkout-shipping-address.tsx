import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, MapPin, Plus, X } from 'lucide-react'
import type { UserAddress } from '@/features/account/api/addresses.api'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

type CheckoutAddressPickerModalProps = {
  open: boolean
  addresses: UserAddress[]
  selectedId: string | 'new' | null
  onClose: () => void
  onConfirm: (id: string) => void
  onAddNew: () => void
}

/** Modal chọn địa chỉ: radio + tag Mặc định + thêm mới. */
export function CheckoutAddressPickerModal({
  open,
  addresses,
  selectedId,
  onClose,
  onConfirm,
  onAddNew,
}: CheckoutAddressPickerModalProps) {
  const [draftId, setDraftId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const initial =
      typeof selectedId === 'string' && selectedId !== 'new'
        ? selectedId
        : (addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null)
    setDraftId(initial)
  }, [open, selectedId, addresses])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Đóng" onClick={onClose} />
      <div
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl bg-background shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-address-picker-title"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 id="checkout-address-picker-title" className="text-base font-semibold">
            Địa chỉ của tôi
          </h3>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {addresses.map((addr) => {
            const active = draftId === addr.id
            return (
              <button
                key={addr.id}
                type="button"
                onClick={() => setDraftId(addr.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                  )}
                  aria-hidden
                >
                  {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{addr.receiverName}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-sm text-muted-foreground">{addr.phone}</span>
                    {addr.isDefault ? (
                      <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                        Mặc định
                      </span>
                    ) : null}
                    {addr.label ? (
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {addr.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{addr.address}</p>
                </div>
              </button>
            )
          })}

          <button
            type="button"
            onClick={onAddNew}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Thêm địa chỉ mới
          </button>
        </div>

        <div className="border-t p-3">
          <Button
            type="button"
            className="w-full"
            disabled={!draftId}
            onClick={() => {
              if (draftId) onConfirm(draftId)
            }}
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

type CheckoutShippingSummaryProps = {
  customerName: string
  phone: string
  address: string
  isDefault?: boolean
  label?: string | null
  loading?: boolean
  onChangeClick: () => void
  emptyActionLabel?: string
}

/** Khối địa chỉ checkout — tóm tắt + nút Thay đổi. */
export function CheckoutShippingSummary({
  customerName,
  phone,
  address,
  isDefault,
  label,
  loading,
  onChangeClick,
  emptyActionLabel = 'Thêm địa chỉ',
}: CheckoutShippingSummaryProps) {
  const hasAddress = Boolean(customerName.trim() && phone.trim() && address.trim())

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <MapPin className="h-4 w-4" aria-hidden />
          Địa chỉ nhận hàng
        </div>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={onChangeClick}
        >
          {hasAddress ? 'Thay đổi' : emptyActionLabel}
        </button>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
        ) : hasAddress ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold">{customerName}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{phone}</span>
              {isDefault ? (
                <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  Mặc định
                </span>
              ) : null}
              {label ? (
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {label}
                </span>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{address}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onChangeClick}
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-4 text-left text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            Chọn hoặc thêm địa chỉ nhận hàng để tiếp tục
          </button>
        )}
      </div>
    </div>
  )
}
