import { httpClient } from '@/shared/api/http-client'
import type { ApiEnvelope } from '@/shared/types/api-result'

const ADDRESSES_BASE = '/api/v1/users/me/addresses'

export type UserAddress = {
  id: string
  label: string | null
  receiverName: string
  phone: string
  address: string
  isDefault: boolean
}

export type UserAddressPayload = {
  label?: string
  receiverName: string
  phone: string
  address: string
  isDefault?: boolean
}

type RawAddress = {
  id?: unknown
  label?: unknown
  receiverName?: unknown
  phone?: unknown
  address?: unknown
  isDefault?: unknown
}

function mapAddress(raw: RawAddress | null | undefined): UserAddress | null {
  if (!raw) return null
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : typeof raw.id === 'number' && Number.isFinite(raw.id)
        ? String(raw.id)
        : null
  const receiverName = typeof raw.receiverName === 'string' ? raw.receiverName : null
  const phone = typeof raw.phone === 'string' ? raw.phone : null
  const address = typeof raw.address === 'string' ? raw.address : null
  if (!id || !receiverName || !phone || !address) return null
  return {
    id,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : null,
    receiverName,
    phone,
    address,
    isDefault: Boolean(raw.isDefault),
  }
}

export const addressesApi = {
  async list(): Promise<UserAddress[]> {
    const { data } = await httpClient.get<ApiEnvelope<unknown>>(ADDRESSES_BASE)
    if (!Array.isArray(data?.result)) return []
    return data.result
      .map((row) => mapAddress((row ?? null) as RawAddress))
      .filter((a): a is UserAddress => a !== null)
  },

  async create(payload: UserAddressPayload): Promise<UserAddress | null> {
    const { data } = await httpClient.post<ApiEnvelope<RawAddress>>(ADDRESSES_BASE, payload)
    return mapAddress(data?.result)
  },

  async update(id: string, payload: UserAddressPayload): Promise<UserAddress | null> {
    const { data } = await httpClient.put<ApiEnvelope<RawAddress>>(
      `${ADDRESSES_BASE}/${id}`,
      payload,
    )
    return mapAddress(data?.result)
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${ADDRESSES_BASE}/${id}`)
  },
}
