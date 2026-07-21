import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  LogOut,
  Receipt,
  UserCog,
} from 'lucide-react'
import { useLogoutMutation } from '@/features/auth/hooks/use-auth'
import { isGoogleAvatarUrl } from '@/features/auth/lib/user-display'
import type { UserRole } from '@/features/auth/types/auth.types'
import { useAuthStore } from '@/shared/stores/auth-store'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'
import { UserAvatar } from '@/shared/ui/user-avatar'
import { cn } from '@/shared/lib/utils'

type UserMenuProps = {
  email: string
  className?: string
  /** `default` cho nền sáng, `onPrimary` cho header xanh dương */
  variant?: 'default' | 'onPrimary'
  /** Menu bung lên (sidebar đáy) hoặc xuống (header) */
  menuPlacement?: 'up' | 'down'
  /** Sidebar thu gọn: chỉ hiện avatar */
  compact?: boolean
  /** Gọi khi chọn một mục (đóng drawer mobile, …) */
  onNavigate?: () => void
}

type MenuLink = {
  to: string
  label: string
  icon: typeof UserCog
}

function menuLinksForRole(role?: UserRole | null): MenuLink[] {
  if (role === 'ADMIN') {
    return [
      { to: '/admin/account', label: 'Tài khoản của tôi', icon: UserCog },
      { to: '/', label: 'Về cửa hàng', icon: ExternalLink },
    ]
  }
  if (role === 'SELLER') {
    return [
      { to: '/seller/account', label: 'Tài khoản của tôi', icon: UserCog },
      { to: '/', label: 'Về cửa hàng', icon: ExternalLink },
    ]
  }
  return [
    { to: '/account', label: 'Tài khoản của tôi', icon: UserCog },
    { to: '/account/orders', label: 'Đơn mua', icon: Receipt },
  ]
}

export function UserMenu({
  email,
  className,
  variant = 'default',
  menuPlacement = 'down',
  compact = false,
  onNavigate,
}: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.user)
  const linkedGoogle = isGoogleAvatarUrl(profile?.avatarUrl)
  const links = menuLinksForRole(profile?.role)
  const opensUp = menuPlacement === 'up'

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
    onNavigate?.()
    navigate('/auth/login', { replace: true })
    logout.mutate()
  }

  const displayName = profile?.fullName?.trim() || email
  const ChevronIcon = opensUp ? ChevronUp : ChevronDown

  return (
    <>
      {logout.isPending ? <FullPageSpinner message="Đang đăng xuất..." /> : null}
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={open}
          title={compact ? displayName : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg text-sm transition-colors',
            compact
              ? 'h-10 w-10 justify-center'
              : 'min-h-11 w-full min-w-0 justify-start px-2 py-2 sm:min-h-0 sm:py-1.5',
            variant === 'onPrimary'
              ? cn(
                  'text-primary-foreground/85 hover:text-primary-foreground',
                  open && 'text-primary-foreground',
                )
              : cn(
                  'text-muted-foreground hover:bg-muted hover:text-foreground',
                  open && 'bg-muted text-foreground',
                ),
          )}
        >
          <UserAvatar
            fullName={profile?.fullName}
            email={email}
            avatarUrl={profile?.avatarUrl}
            size="xs"
            tone={variant === 'onPrimary' ? 'onPrimary' : 'default'}
          />
          {!compact ? (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{displayName}</span>
              <ChevronIcon
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'opacity-70')}
                aria-hidden
              />
            </>
          ) : (
            <span className="sr-only">{displayName}</span>
          )}
        </button>

        {open ? (
          <div
            role="menu"
            className={cn(
              'absolute z-50 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl',
              opensUp ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2',
              compact && opensUp && 'left-1/2 w-56 -translate-x-1/2',
            )}
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
              {links.map((item) => (
                <Link
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false)
                    onNavigate?.()
                  }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {item.label}
                </Link>
              ))}
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
