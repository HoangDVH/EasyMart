import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  usersApi,
  type AdminCreateUserPayload,
  type AdminRolePayload,
  type UserUpdatePayload,
} from '@/features/account/api/users.api'

export const usersQueryKeyRoot = ['users'] as const

export function useUpdateMyInfoMutation() {
  return useMutation({
    mutationFn: (payload: UserUpdatePayload) => usersApi.updateMe(payload),
  })
}

export function useUsersQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeyRoot,
    queryFn: () => usersApi.listAll(),
    enabled,
    staleTime: 20 * 1000,
  })
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => usersApi.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKeyRoot })
    },
  })
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UserUpdatePayload }) =>
      usersApi.updateUser(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKeyRoot })
    },
  })
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKeyRoot })
    },
  })
}

export function useAssignRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminRolePayload }) =>
      usersApi.assignRole(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKeyRoot })
    },
  })
}
