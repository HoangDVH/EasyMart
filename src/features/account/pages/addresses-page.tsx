import { useState } from 'react'
import { toast } from 'react-toastify'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { AddressFormModal } from '@/features/account/components/address-form-modal'
import type { UserAddress } from '@/features/account/api/addresses.api'
import {
  useAddressesQuery,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useUpdateAddressMutation,
} from '@/features/account/hooks/use-addresses'
import type { UserAddressFormValues } from '@/features/account/schemas/profile.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'

export function AddressesPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const addressesQuery = useAddressesQuery(Boolean(accessToken))
  const createMutation = useCreateAddressMutation()
  const updateMutation = useUpdateAddressMutation()
  const deleteMutation = useDeleteAddressMutation()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserAddress | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserAddress | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (address: UserAddress) => {
    setEditing(address)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const onSubmit = async (data: UserAddressFormValues) => {
    const payload = {
      label: data.label?.trim() || undefined,
      receiverName: data.receiverName.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      isDefault: Boolean(data.isDefault),
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload })
        toast.success('Đã cập nhật địa chỉ.')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Đã thêm địa chỉ.')
      }
      closeForm()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không lưu được địa chỉ.'))
    }
  }

  const onDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Đã xóa địa chỉ.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xóa được địa chỉ.'))
    }
  }

  const onSetDefault = async (address: UserAddress) => {
    if (address.isDefault) return
    try {
      await updateMutation.mutateAsync({
        id: address.id,
        payload: {
          label: address.label ?? undefined,
          receiverName: address.receiverName,
          phone: address.phone,
          address: address.address,
          isDefault: true,
        },
      })
      toast.success('Đã đặt làm địa chỉ mặc định.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không đặt được địa chỉ mặc định.'))
    }
  }

  const addresses = addressesQuery.data ?? []
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Địa chỉ của tôi</h2>
          <p className="text-sm text-muted-foreground">Quản lý địa chỉ giao hàng khi mua sắm.</p>
        </div>
        <Button
          type="button"
          className="gap-2 self-start"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Thêm địa chỉ mới
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {addressesQuery.isPending ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : addressesQuery.isError ? (
            <p className="p-4 text-sm text-destructive">
              {getApiErrorMessage(addressesQuery.error, 'Không tải được sổ địa chỉ.')}
            </p>
          ) : addresses.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Chưa có địa chỉ"
              description="Thêm địa chỉ nhận hàng để thanh toán nhanh như trên Shopee."
              action={
                <Button
                  type="button"
                  className="gap-2"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Thêm địa chỉ mới
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {addresses.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'px-4 py-4 transition-colors',
                    item.isDefault && 'bg-primary/[0.03]',
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-semibold">{item.receiverName}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{item.phone}</span>
                        {item.isDefault ? (
                          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                            Mặc định
                          </span>
                        ) : null}
                        {item.label ? (
                          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {item.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.address}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.isDefault ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={() => void onSetDefault(item)}
                          disabled={updateMutation.isPending}
                        >
                          Thiết lập mặc định
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddressFormModal
        open={formOpen}
        editing={editing}
        defaultAsFirst={addresses.length === 0}
        isSubmitting={saving}
        onClose={closeForm}
        onSubmit={onSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa địa chỉ?"
        description={
          deleteTarget
            ? `Xóa địa chỉ của ${deleteTarget.receiverName}? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void onDeleteConfirm()}
      />
    </div>
  )
}
