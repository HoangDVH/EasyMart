import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addressesApi,
  type UserAddressPayload,
} from '@/features/account/api/addresses.api'
import { useAuthStore } from '@/shared/stores/auth-store'

export const addressesQueryKeyRoot = ['user-addresses'] as const

export function getAddressesQueryKey(userKey: string) {
  return [...addressesQueryKeyRoot, userKey] as const
}

export function useAddressesQuery(enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const userId = useAuthStore((s) => s.user?.id)
  const userKey = userId || accessToken || 'anon'

  return useQuery({
    queryKey: getAddressesQueryKey(userKey),
    queryFn: () => addressesApi.list(),
    enabled: enabled && Boolean(accessToken),
    staleTime: 30 * 1000,
  })
}

export function useCreateAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserAddressPayload) => addressesApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKeyRoot })
    },
  })
}

export function useUpdateAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserAddressPayload }) =>
      addressesApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKeyRoot })
    },
  })
}

export function useDeleteAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKeyRoot })
    },
  })
}
