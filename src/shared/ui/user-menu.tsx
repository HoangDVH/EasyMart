import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Receipt, UserCog, UserRound } from 'lucide-react'
import { useLogoutMutation } from '@/features/auth/hooks/use-auth'
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
        navigate('/auth/login', { replace: true })
      },
    })
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
          variant === 'onPrimary'
            ? cn(
                'text-primary-foreground/85 hover:text-primary-foreground',
                open && 'text-primary-foreground',
              )
            : cn(
                'text-muted-foreground hover:text-foreground',
                open && 'text-foreground',
              ),
        )}
      >
        <UserRound className="h-4 w-4" aria-hidden />
        <span className="hidden max-w-[160px] truncate sm:inline">{email}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
        >
          <div className="bg-gradient-to-r from-primary to-primary/85 px-4 py-3 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-wide opacity-80">Tài khoản</p>
            <p className="mt-0.5 truncate text-sm font-semibold" title={email}>
              {email}
            </p>
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
              <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden />
              {logout.isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
