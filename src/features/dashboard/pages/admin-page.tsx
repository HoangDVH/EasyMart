import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import type { UserRole } from '@/features/auth/types/auth.types'
import {
  useAssignRoleMutation,
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '@/features/account/hooks/use-users'
import { AdminResetPasswordModal } from '@/features/dashboard/components/admin-reset-password-modal'
import {
  adminCreateUserSchema,
  type AdminCreateUserFormValues,
} from '@/features/dashboard/schemas/admin.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'

type RoleOption = {
  value: UserRole
  label: string
}

const roleOptions: RoleOption[] = [
  { value: 'USER', label: 'USER' },
  { value: 'SELLER', label: 'SELLER' },
  { value: 'ADMIN', label: 'ADMIN' },
]

function normalizeRoleToken(value: string): UserRole | null {
  const normalized = value.replace(/^ROLE_/i, '').toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'SELLER' || normalized === 'USER') {
    return normalized
  }
  return null
}

export function AdminPage() {
  const usersQuery = useUsersQuery(true)
  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation()
  const deleteUserMutation = useDeleteUserMutation()
  const assignRoleMutation = useAssignRoleMutation()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(
    null,
  )

  const {
    register: registerCreateUser,
    handleSubmit: handleCreateUserSubmit,
    reset: resetCreateUserForm,
    formState: { errors: createUserErrors, isSubmitting: isCreatingUserForm },
  } = useForm<AdminCreateUserFormValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { email: '', password: '' },
  })

  const users = usersQuery.data ?? []
  const summary = useMemo(() => {
    let admin = 0
    let seller = 0
    let user = 0
    for (const it of users) {
      if (it.role === 'ADMIN') admin += 1
      else if (it.role === 'SELLER') seller += 1
      else user += 1
    }
    return { admin, seller, user, total: users.length }
  }, [users])

  const filteredUsers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
      if (!keyword) return true
      return u.email.toLowerCase().includes(keyword) || u.id.toLowerCase().includes(keyword)
    })
  }, [users, searchKeyword, roleFilter])

  async function onCreateUser(data: AdminCreateUserFormValues) {
    try {
      await createUserMutation.mutateAsync(data)
      resetCreateUserForm()
      toast.success('Đã tạo user mới.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tạo được user.'))
    }
  }

  async function handleResetPasswordSubmit(password: string) {
    if (!resetPasswordTarget) return
    try {
      await updateUserMutation.mutateAsync({
        id: resetPasswordTarget.id,
        payload: { password },
      })
      toast.success('Đã cập nhật mật khẩu user.')
      setResetPasswordTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu user.'))
    }
  }

  async function handleDeleteUser(id: string, email: string) {
    const ok = window.confirm(`Xóa user ${email}?`)
    if (!ok) return
    try {
      await deleteUserMutation.mutateAsync(id)
      toast.success('Đã xóa user.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xóa được user.'))
    }
  }

  async function handleAssignRoleExclusive(id: string, role: UserRole) {
    setRoleUpdatingUserId(id)
    try {
      const targetUser = users.find((u) => u.id === id)
      const enabledRoles = new Set<UserRole>()
      for (const raw of targetUser?.roles ?? []) {
        const token = normalizeRoleToken(raw)
        if (token) enabledRoles.add(token)
      }
      // fallback cho dữ liệu cũ: nếu `roles` trống thì dựa vào role tổng hợp
      if (enabledRoles.size === 0 && targetUser?.role) enabledRoles.add(targetUser.role)

      const roleMutations: Promise<unknown>[] = []
      for (const option of roleOptions) {
        const shouldEnable = option.value === role
        const currentlyEnabled = enabledRoles.has(option.value)
        if (shouldEnable === currentlyEnabled) continue
        roleMutations.push(
          assignRoleMutation.mutateAsync({
            id,
            payload: { role: option.value, enabled: shouldEnable },
          }),
        )
      }
      if (roleMutations.length > 0) await Promise.all(roleMutations)
      toast.success(`Đã gán role ${role}.`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không gán được role.'))
    } finally {
      setRoleUpdatingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      {roleUpdatingUserId ? <FullPageSpinner message="Đang cập nhật phân quyền..." /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Quyền quản trị toàn bộ hệ thống: tạo user, xóa user, reset mật khẩu, phân role.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Tổng user</p>
            <p className="text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">ADMIN</p>
            <p className="text-2xl font-semibold">{summary.admin}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">SELLER</p>
            <p className="text-2xl font-semibold">{summary.seller}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">USER</p>
            <p className="text-2xl font-semibold">{summary.user}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tạo tài khoản mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-start"
            onSubmit={handleCreateUserSubmit(onCreateUser)}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="admin-create-email">Email</Label>
              <Input
                id="admin-create-email"
                type="email"
                placeholder="new.user@gmail.com"
                {...registerCreateUser('email')}
              />
              {createUserErrors.email ? (
                <p className="text-xs text-destructive">{createUserErrors.email.message}</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-create-password">Mật khẩu</Label>
              <Input
                id="admin-create-password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                {...registerCreateUser('password')}
              />
              {createUserErrors.password ? (
                <p className="text-xs text-destructive">{createUserErrors.password.message}</p>
              ) : null}
            </div>
            <Button
              type="submit"
              className="md:mt-6"
              disabled={createUserMutation.isPending || isCreatingUserForm}
            >
              {createUserMutation.isPending ? 'Đang tạo...' : 'Tạo user'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Quản lý người dùng & phân quyền</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo email hoặc ID"
            />
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            >
              <option value="ALL">Role: Tất cả</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={() => void usersQuery.refetch()} disabled={usersQuery.isFetching}>
              {usersQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usersQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : usersQuery.isError ? (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(usersQuery.error, 'Không tải được danh sách người dùng.')}
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có user phù hợp bộ lọc.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">Role hiện tại</th>
                    <th className="px-3 py-2 font-medium">Roles từ backend</th>
                    <th className="px-3 py-2 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{user.id}</td>
                      <td className="px-3 py-2">
                        <Badge>{user.role}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles.length > 0 ? user.roles : ['(none)']).map((r) => (
                            <Badge key={`${user.id}-${r}`} className="border-border/70 bg-muted/30 text-foreground">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={user.role}
                            onChange={(e) =>
                              void handleAssignRoleExclusive(user.id, e.target.value as UserRole)
                            }
                            className="w-36"
                            disabled={Boolean(roleUpdatingUserId)}
                          >
                            {roleOptions.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setResetPasswordTarget({ id: user.id, email: user.email })
                            }
                            disabled={updateUserMutation.isPending || Boolean(roleUpdatingUserId)}
                          >
                            Reset mật khẩu
                          </Button>
                          <Button
                            size="sm"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDeleteUser(user.id, user.email)}
                            disabled={deleteUserMutation.isPending || Boolean(roleUpdatingUserId)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminResetPasswordModal
        open={Boolean(resetPasswordTarget)}
        email={resetPasswordTarget?.email ?? ''}
        isSubmitting={updateUserMutation.isPending}
        onClose={() => setResetPasswordTarget(null)}
        onSubmit={handleResetPasswordSubmit}
      />
    </div>
  )
}
