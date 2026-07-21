import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Loader2, LogOut, Receipt, UserCog } from 'lucide-react'
import { useLogoutMutation } from '@/features/auth/hooks/use-auth'
import { isGoogleAvatarUrl } from '@/features/auth/lib/user-display'
import { useAuthStore } from '@/shared/stores/auth-store'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { UserAvatar } from '@/shared/ui/user-avatar'
import { cn } from '@/shared/lib/utils'

type UserMenuProps = {
  email: string
  className?: string
  /** `default` cho nền sáng, `onPrimary` cho header xanh dương */
  variant?: 'default' | 'onPrimary'
}

export function UserMenu({ email, className, variant = 'default' }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.user)
  const linkedGoogle = isGoogleAvatarUrl(profile?.avatarUrl)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const handleLogout = () => {
    setOpen(false)
    logout.mutate(undefined, {
      onSettled: () => {
        navigate('/auth/login', { replace: true, state: { loggedOut: true } })
      },
    })
  }

  const displayName = profile?.fullName?.trim() || email

  return (
    <>
      {logout.isPending ? <FullPageSpinner message="Đang đăng xuất..." /> : null}
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm transition-colors sm:min-h-0 sm:min-w-0 sm:py-1.5',
            variant === 'onPrimary'
              ? cn(
                  'text-primary-foreground/85 hover:text-primary-foreground',
                  open && 'text-primary-foreground',
                )
              : cn('text-muted-foreground hover:text-foreground', open && 'text-foreground'),
          )}
        >
          <UserAvatar
            fullName={profile?.fullName}
            email={email}
            avatarUrl={profile?.avatarUrl}
            size="xs"
            tone={variant === 'onPrimary' ? 'onPrimary' : 'default'}
          />
          <span className="hidden max-w-[140px] truncate sm:inline">{displayName}</span>
          <ChevronDown
            className={cn('hidden h-3.5 w-3.5 transition-transform sm:inline', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/85 px-4 py-3 text-primary-foreground">
              <UserAvatar
                fullName={profile?.fullName}
                email={email}
                avatarUrl={profile?.avatarUrl}
                size="md"
                tone="onPrimary"
                showGoogleBadge={linkedGoogle}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" title={displayName}>
                  {displayName}
                </p>
                <p className="truncate text-xs opacity-85" title={email}>
                  {email}
                </p>
              </div>
            </div>

            <div className="py-1.5">
              <Link
                to="/account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <UserCog className="h-4 w-4 text-muted-foreground" aria-hidden />
                Tài khoản của tôi
              </Link>
              <Link
                to="/account/orders"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden />
                Đơn mua
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={logout.isPending}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                {logout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden />
                )}
                {logout.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
