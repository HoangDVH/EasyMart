import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addressesApi,
  type UserAddressPayload,
} from '@/features/account/api/addresses.api'

export const addressesQueryKey = ['user-addresses'] as const

export function useAddressesQuery(enabled = true) {
  return useQuery({
    queryKey: addressesQueryKey,
    queryFn: () => addressesApi.list(),
    enabled,
    staleTime: 30 * 1000,
  })
}

export function useCreateAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserAddressPayload) => addressesApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKey })
    },
  })
}

export function useUpdateAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserAddressPayload }) =>
      addressesApi.update(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKey })
    },
  })
}

export function useDeleteAddressMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: addressesQueryKey })
    },
  })
}
