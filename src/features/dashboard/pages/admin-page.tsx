import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Store,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'react-toastify'
import type { UserRole } from '@/features/auth/types/auth.types'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import {
  useAssignRoleMutation,
  useCreateUserMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
  useUsersQuery,
} from '@/features/account/hooks/use-users'
import { AdminCreateUserModal } from '@/features/dashboard/components/admin-create-user-modal'
import { AdminResetPasswordModal } from '@/features/dashboard/components/admin-reset-password-modal'
import type { AdminCreateUserFormValues } from '@/features/dashboard/schemas/admin.schemas'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { PaginationBar } from '@/shared/ui/pagination-bar'
import { Select } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'

type RoleOption = {
  value: UserRole
  label: string
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'USER', label: 'Người mua' },
  { value: 'SELLER', label: 'Người bán' },
  { value: 'ADMIN', label: 'Quản trị' },
]

const PAGE_SIZE = 10

/** Tài khoản admin hệ thống — không cho đổi quyền / xóa khi test. */
const PROTECTED_ADMIN_EMAIL = 'admin@gmail.com'

function isProtectedAdminEmail(email: string) {
  return email.trim().toLowerCase() === PROTECTED_ADMIN_EMAIL
}

function normalizeRoleToken(value: string): UserRole | null {
  const normalized = value.replace(/^ROLE_/i, '').toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'SELLER' || normalized === 'USER') {
    return normalized
  }
  return null
}

function roleLabel(role: UserRole) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge
      className={cn(
        'border-transparent font-medium',
        role === 'ADMIN' && 'bg-violet-100 text-violet-800',
        role === 'SELLER' && 'bg-sky-100 text-sky-800',
        role === 'USER' && 'bg-slate-100 text-slate-700',
      )}
    >
      {roleLabel(role)}
    </Badge>
  )
}

export function AdminPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const storeUserId = useAuthStore((state) => state.user?.id)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const currentUserId = storeUserId ?? profileQuery.data?.id
  const usersQuery = useUsersQuery(true)
  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation()
  const deleteUserMutation = useDeleteUserMutation()
  const assignRoleMutation = useAssignRoleMutation()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [roleUpdatingUserId, setRoleUpdatingUserId] = useState<string | null>(null)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; email: string } | null>(
    null,
  )
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null)

  function isSelfUser(id: string) {
    return Boolean(currentUserId && id === currentUserId)
  }

  function isLockedUser(user: { id: string; email: string }) {
    return isProtectedAdminEmail(user.email) || isSelfUser(user.id)
  }

  function lockReason(user: { id: string; email: string }) {
    if (isSelfUser(user.id)) return 'Không thể thao tác trên tài khoản của chính bạn'
    if (isProtectedAdminEmail(user.email)) return 'Không thể thao tác tài khoản admin hệ thống'
    return undefined
  }

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
      return u.email.toLowerCase().includes(keyword)
    })
  }, [users, searchKeyword, roleFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))

  useEffect(() => {
    setPage(0)
  }, [searchKeyword, roleFilter])

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1))
  }, [page, totalPages])

  const pageUsers = useMemo(() => {
    const start = page * PAGE_SIZE
    return filteredUsers.slice(start, start + PAGE_SIZE)
  }, [filteredUsers, page])

  async function onCreateUser(data: AdminCreateUserFormValues) {
    try {
      await createUserMutation.mutateAsync(data)
      toast.success('Đã tạo người dùng mới.')
      setCreateOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không tạo được người dùng.'))
    }
  }

  async function handleResetPasswordSubmit(password: string) {
    if (!resetPasswordTarget) return
    if (isSelfUser(resetPasswordTarget.id)) {
      toast.error('Không thể đặt lại mật khẩu tài khoản của chính bạn.')
      setResetPasswordTarget(null)
      return
    }
    if (isProtectedAdminEmail(resetPasswordTarget.email)) {
      toast.error('Không thể đặt lại mật khẩu tài khoản admin hệ thống.')
      setResetPasswordTarget(null)
      return
    }
    try {
      await updateUserMutation.mutateAsync({
        id: resetPasswordTarget.id,
        payload: { password },
      })
      toast.success('Đã cập nhật mật khẩu.')
      setResetPasswordTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không cập nhật được mật khẩu.'))
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    if (isSelfUser(deleteTarget.id)) {
      toast.error('Không thể xóa tài khoản của chính bạn.')
      setDeleteTarget(null)
      return
    }
    if (isProtectedAdminEmail(deleteTarget.email)) {
      toast.error('Không thể xóa tài khoản admin hệ thống.')
      setDeleteTarget(null)
      return
    }
    try {
      await deleteUserMutation.mutateAsync(deleteTarget.id)
      toast.success('Đã xóa người dùng.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xóa được người dùng.'))
    }
  }

  async function handleAssignRoleExclusive(id: string, role: UserRole) {
    const targetUser = users.find((u) => u.id === id)
    if (isSelfUser(id)) {
      toast.error('Không thể đổi quyền tài khoản của chính bạn.')
      return
    }
    if (targetUser && isProtectedAdminEmail(targetUser.email)) {
      toast.error('Không thể đổi quyền tài khoản admin hệ thống.')
      return
    }
    setRoleUpdatingUserId(id)
    try {
      const enabledRoles = new Set<UserRole>()
      for (const raw of targetUser?.roles ?? []) {
        const token = normalizeRoleToken(raw)
        if (token) enabledRoles.add(token)
      }
      if (enabledRoles.size === 0 && targetUser?.role) enabledRoles.add(targetUser.role)

      for (const option of ROLE_OPTIONS) {
        const shouldEnable = option.value === role
        const currentlyEnabled = enabledRoles.has(option.value)
        if (shouldEnable === currentlyEnabled) continue
        await assignRoleMutation.mutateAsync({
          id,
          payload: { role: option.value, enabled: shouldEnable },
        })
      }
      await usersQuery.refetch()
      toast.success(`Đã gán quyền ${roleLabel(role)}.`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không gán được quyền.'))
      await usersQuery.refetch()
    } finally {
      setRoleUpdatingUserId(null)
    }
  }

  const kpiCards = [
    {
      label: 'Tổng người dùng',
      value: summary.total,
      icon: Users,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      label: 'Quản trị',
      value: summary.admin,
      icon: Shield,
      iconClass: 'bg-violet-100 text-violet-700',
    },
    {
      label: 'Người bán',
      value: summary.seller,
      icon: Store,
      iconClass: 'bg-sky-100 text-sky-700',
    },
    {
      label: 'Người mua',
      value: summary.user,
      icon: UserRound,
      iconClass: 'bg-slate-100 text-slate-700',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.label} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', card.iconClass)}>
                <card.icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                {usersQuery.isPending ? (
                  <Skeleton className="mt-1 h-5 w-12" />
                ) : (
                  <p className="text-lg font-semibold tabular-nums">{card.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Danh sách người dùng</h2>
            <p className="text-sm text-muted-foreground">
              {usersQuery.isPending
                ? 'Đang tải…'
                : `${filteredUsers.length} / ${summary.total} tài khoản`}
            </p>
          </div>
          <Button type="button" className="gap-2 self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Thêm người dùng
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center">
          <Input
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo email…"
            className="md:max-w-sm"
            aria-label="Tìm người dùng theo email"
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            className="md:w-48"
            aria-label="Lọc theo quyền"
          >
            <option value="ALL">Tất cả quyền</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            className="gap-2 md:ml-auto"
            onClick={() => void usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', usersQuery.isFetching && 'animate-spin')} aria-hidden />
            Làm mới
          </Button>
        </div>

        <CardContent className="p-0">
          {usersQuery.isPending ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : usersQuery.isError ? (
            <p className="p-4 text-sm text-destructive">
              {getApiErrorMessage(usersQuery.error, 'Không tải được danh sách người dùng.')}
            </p>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Không có người dùng phù hợp"
              description={
                searchKeyword || roleFilter !== 'ALL'
                  ? 'Thử đổi từ khóa hoặc bộ lọc quyền.'
                  : 'Tạo tài khoản đầu tiên để bắt đầu quản trị.'
              }
              action={
                !searchKeyword && roleFilter === 'ALL' ? (
                  <Button type="button" className="gap-2" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Thêm người dùng
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="divide-y md:hidden">
                {pageUsers.map((user) => {
                  const busy = roleUpdatingUserId === user.id
                  const isProtected = isProtectedAdminEmail(user.email)
                  const isLocked = isLockedUser(user)
                  const reason = lockReason(user)
                  return (
                    <div key={user.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.email}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <RoleBadge role={user.role} />
                            {isProtected ? (
                              <Badge className="border-transparent bg-amber-100 font-medium text-amber-800">
                                Bảo vệ
                              </Badge>
                            ) : null}
                            {isSelfUser(user.id) ? (
                              <Badge className="border-transparent bg-slate-100 font-medium text-slate-700">
                                Bạn
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {busy ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                        ) : null}
                      </div>
                      <Select
                        value={user.role}
                        onChange={(e) => void handleAssignRoleExclusive(user.id, e.target.value as UserRole)}
                        disabled={isLocked || Boolean(roleUpdatingUserId)}
                        aria-label={`Quyền của ${user.email}`}
                        title={reason}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          onClick={() => {
                            if (isSelfUser(user.id)) {
                              toast.error('Không thể đặt lại mật khẩu tài khoản của chính bạn.')
                              return
                            }
                            setResetPasswordTarget({ id: user.id, email: user.email })
                          }}
                          disabled={
                            isLocked ||
                            updateUserMutation.isPending ||
                            Boolean(roleUpdatingUserId)
                          }
                          title={reason}
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden />
                          Đặt lại MK
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (isSelfUser(user.id)) {
                              toast.error('Không thể xóa tài khoản của chính bạn.')
                              return
                            }
                            setDeleteTarget({ id: user.id, email: user.email })
                          }}
                          disabled={
                            isLocked ||
                            deleteUserMutation.isPending ||
                            Boolean(roleUpdatingUserId)
                          }
                          title={reason ?? `Xóa ${user.email}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Quyền</th>
                      <th className="px-4 py-3 font-medium">Đổi quyền</th>
                      <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageUsers.map((user) => {
                      const busy = roleUpdatingUserId === user.id
                      const isProtected = isProtectedAdminEmail(user.email)
                      const isLocked = isLockedUser(user)
                      const reason = lockReason(user)
                      return (
                        <tr
                          key={user.id}
                          className={cn('border-b last:border-b-0', busy && 'bg-muted/20')}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{user.email}</span>
                              {isProtected ? (
                                <Badge className="border-transparent bg-amber-100 font-medium text-amber-800">
                                  Bảo vệ
                                </Badge>
                              ) : null}
                              {isSelfUser(user.id) ? (
                                <Badge className="border-transparent bg-slate-100 font-medium text-slate-700">
                                  Bạn
                                </Badge>
                              ) : null}
                              {busy ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin text-muted-foreground"
                                  aria-label="Đang cập nhật quyền"
                                />
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={user.role} />
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={user.role}
                              onChange={(e) =>
                                void handleAssignRoleExclusive(user.id, e.target.value as UserRole)
                              }
                              className="w-40"
                              disabled={isLocked || Boolean(roleUpdatingUserId)}
                              aria-label={`Đổi quyền ${user.email}`}
                              title={reason}
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                title={reason ?? 'Đặt lại mật khẩu'}
                                onClick={() => {
                                  if (isSelfUser(user.id)) {
                                    toast.error('Không thể đặt lại mật khẩu tài khoản của chính bạn.')
                                    return
                                  }
                                  setResetPasswordTarget({ id: user.id, email: user.email })
                                }}
                                disabled={
                                  isLocked ||
                                  updateUserMutation.isPending ||
                                  Boolean(roleUpdatingUserId)
                                }
                              >
                                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                                Đặt lại MK
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title={reason ?? 'Xóa người dùng'}
                                aria-label={`Xóa ${user.email}`}
                                onClick={() => {
                                  if (isSelfUser(user.id)) {
                                    toast.error('Không thể xóa tài khoản của chính bạn.')
                                    return
                                  }
                                  setDeleteTarget({ id: user.id, email: user.email })
                                }}
                                disabled={
                                  isLocked ||
                                  deleteUserMutation.isPending ||
                                  Boolean(roleUpdatingUserId)
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length > PAGE_SIZE ? (
                <div className="px-4 pb-4">
                  <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AdminCreateUserModal
        open={createOpen}
        isSubmitting={createUserMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreateUser}
      />

      <AdminResetPasswordModal
        open={Boolean(resetPasswordTarget)}
        email={resetPasswordTarget?.email ?? ''}
        isSubmitting={updateUserMutation.isPending}
        onClose={() => setResetPasswordTarget(null)}
        onSubmit={handleResetPasswordSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa người dùng?"
        description={
          deleteTarget
            ? `Tài khoản ${deleteTarget.email} sẽ bị xóa vĩnh viễn và không thể khôi phục.`
            : ''
        }
        confirmLabel="Xóa"
        destructive
        loading={deleteUserMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  )
}
