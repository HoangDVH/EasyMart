import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Bell, BellOff, CheckCheck, ImageOff, ShoppingBag, Truck } from 'lucide-react'
import {
  useOrderNotificationsStore,
  type NotificationAudience,
  type OrderNotification,
} from '@/features/orders/stores/order-notifications-store'
import type { User } from '@/features/auth/types/auth.types'
import { cn } from '@/shared/lib/utils'
import { formatVnd } from '@/shared/lib/product-price'
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
    <div
      className={cn(
        'rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70',
        !notification.read && 'bg-primary/5',
      )}
    >
      {/* Tiêu đề mở đúng đơn hàng; từng sản phẩm bên dưới có link riêng. */}
      <Link
        to={notification.href}
        onClick={() => onRead(notification.id)}
        className="flex items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          <p
            className={cn(
              'text-sm leading-snug text-foreground hover:text-primary',
              !notification.read && 'font-medium',
            )}
          >
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

      <div className="ml-11">
        {notification.products.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            {notification.products.slice(0, 2).map((product) => (
              <Link
                key={product.productId}
                to={notification.href}
                onClick={() => onRead(notification.id)}
                aria-label={`Xem trạng thái đơn ${notification.orderId} có sản phẩm ${product.name}`}
                className="flex items-center gap-2 rounded-md border border-transparent p-1 transition-colors hover:border-border hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-background">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatVnd(product.unitPrice)} × {product.quantity}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatVnd(product.unitPrice * product.quantity)}
                </p>
              </Link>
            ))}
            {notification.products.length > 2 ? (
              <Link
                to={notification.href}
                onClick={() => onRead(notification.id)}
                className="block pl-11 text-[11px] text-primary hover:underline"
              >
                +{notification.products.length - 2} sản phẩm khác
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

type HeaderNotificationsProps = {
  user: User | null | undefined
  /** `onPrimary` = chuông trên header xanh */
  variant?: 'default' | 'onPrimary'
  /** Hiện chữ cạnh chuông (top bar kiểu Shopee) */
  label?: string
}

/** Chuông thông báo trên navbar — lọc theo role của user đang đăng nhập. */
export function HeaderNotifications({ user, variant = 'onPrimary', label }: HeaderNotificationsProps) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const notifications = useOrderNotificationsStore((state) => state.notifications)
  const markAllRead = useOrderNotificationsStore((state) => state.markAllRead)
  const markRead = useOrderNotificationsStore((state) => state.markRead)

  const allowed = useMemo(() => audiencesForUser(user), [user])
  const visible = useMemo(
    () => notifications.filter((item) => allowed.has(item.audience)),
    [notifications, allowed],
  )
  const unreadCount = visible.reduce((count, item) => (item.read ? count : count + 1), 0)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPanelPos(null)
      return
    }
    const place = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      // Trigger bị ẩn (đổi breakpoint mobile/desktop) → đóng panel
      if (rect.width < 1 || rect.height < 1) {
        setOpen(false)
        setPanelPos(null)
        return
      }
      const width = Math.min(400, window.innerWidth - 16)
      let left = rect.right - width
      if (left < 8) left = 8
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
      const next = { top: rect.bottom + 8, left, width }
      setPanelPos((prev) =>
        prev && prev.top === next.top && prev.left === next.left && prev.width === next.width
          ? prev
          : next,
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
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
        ref={buttonRef}
        type="button"
        aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-2 transition sm:min-h-0 sm:min-w-0 sm:p-1.5',
          variant === 'onPrimary'
            ? cn(
                'text-primary-foreground/85 hover:text-primary-foreground',
                open && 'text-primary-foreground',
              )
            : cn('text-muted-foreground hover:text-foreground', open && 'text-foreground'),
        )}
      >
        <span className="relative inline-flex">
          <Bell className={cn(label ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-secondary-foreground ring-2 ring-primary">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </span>
        {label ? <span className="ml-1.5">{label}</span> : null}
      </button>

      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{
                position: 'fixed',
                top: panelPos.top,
                left: panelPos.left,
                width: panelPos.width,
                zIndex: 60,
              }}
              className="overflow-hidden rounded-xl border bg-background text-foreground shadow-xl"
            >
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Thông báo</p>
                  <p className="truncate text-[11px] text-muted-foreground">
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
                    className="h-9 shrink-0 gap-1 px-2 text-xs"
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
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
