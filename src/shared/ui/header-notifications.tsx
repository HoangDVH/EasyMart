import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, ShoppingBag, Truck } from 'lucide-react'
import {
  useOrderNotificationsStore,
  type NotificationAudience,
  type OrderNotification,
} from '@/features/orders/stores/order-notifications-store'
import type { User } from '@/features/auth/types/auth.types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  )
}

function audiencesForUser(user: User | null | undefined): Set<NotificationAudience> {
  const set = new Set<NotificationAudience>(['buyer'])
  if (!user) return set
  const roles = [...(user.roles ?? []), user.role].map((item) =>
    item.replace(/^ROLE_/i, '').toUpperCase(),
  )
  if (roles.includes('SELLER') || roles.includes('ADMIN')) set.add('seller')
  if (roles.includes('ADMIN')) set.add('admin')
  return set
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: OrderNotification
  onRead: (id: string) => void
}) {
  const isNewOrder = notification.type === 'new-order'
  return (
    <Link
      to={notification.href}
      onClick={() => onRead(notification.id)}
      className={cn(
        'flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70',
        !notification.read && 'bg-primary/5',
      )}
    >
      <div
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
          isNewOrder ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600',
        )}
      >
        {isNewOrder ? (
          <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Truck className="h-3.5 w-3.5" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug text-foreground', !notification.read && 'font-medium')}>
          {notification.message}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
          {notification.audience === 'seller'
            ? ' · Người bán'
            : notification.audience === 'admin'
              ? ' · Admin'
              : ' · Đơn mua'}
        </p>
      </div>
      {!notification.read ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Chưa đọc" />
      ) : null}
    </Link>
  )
}

type HeaderNotificationsProps = {
  user: User | null | undefined
  /** `onPrimary` = chuông trên header xanh */
  variant?: 'default' | 'onPrimary'
}

/** Chuông thông báo trên navbar — lọc theo role của user đang đăng nhập. */
export function HeaderNotifications({ user, variant = 'onPrimary' }: HeaderNotificationsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const notifications = useOrderNotificationsStore((state) => state.notifications)
  const markAllRead = useOrderNotificationsStore((state) => state.markAllRead)
  const markRead = useOrderNotificationsStore((state) => state.markRead)

  const allowed = useMemo(() => audiencesForUser(user), [user])
  const visible = useMemo(
    () => notifications.filter((item) => allowed.has(item.audience)),
    [notifications, allowed],
  )
  const unreadCount = visible.reduce((count, item) => (item.read ? count : count + 1), 0)

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex items-center justify-center rounded-md p-1.5 transition',
          variant === 'onPrimary'
            ? cn(
                'text-primary-foreground/85 hover:text-primary-foreground',
                open && 'text-primary-foreground',
              )
            : cn('text-muted-foreground hover:text-foreground', open && 'text-foreground'),
        )}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground ring-2 ring-primary">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-background text-foreground shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">Thông báo</p>
              <p className="text-[11px] text-muted-foreground">
                {user?.role === 'ADMIN'
                  ? 'Đơn hàng & kênh bán (Admin)'
                  : user?.role === 'SELLER'
                    ? 'Đơn bán & đơn mua của bạn'
                    : 'Cập nhật đơn mua của bạn'}
              </p>
            </div>
            {unreadCount > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1 px-2 text-xs"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đã đọc
              </Button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <BellOff className="h-5 w-5 text-muted-foreground/60" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">Chưa có thông báo mới.</p>
              </div>
            ) : (
              visible.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={(id) => {
                    markRead(id)
                    setOpen(false)
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
