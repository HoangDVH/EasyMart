import { NavLink } from 'react-router-dom'
import { CreditCard, Receipt, UserCog, UserRound } from 'lucide-react'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { useOrdersRealtime } from '@/features/orders/hooks/use-orders-realtime'
import { useAuthStore } from '@/shared/stores/auth-store'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { AnimatedOutlet } from '@/shared/ui/page-transition'

type NavItem = {
  to: string
  label: string
  icon: typeof UserCog
  end?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/account',
    label: 'Tài khoản',
    icon: UserCog,
    end: true,
  },
  {
    to: '/account/orders',
    label: 'Đơn mua',
    icon: Receipt,
  },
  {
    to: '/account/payments',
    label: 'Thanh toán',
    icon: CreditCard,
  },
]

export function AccountLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const profile = profileQuery.data
  /** Buyer cũng nhận FULFILLMENT_STATUS_CHANGED qua /user/queue/orders. */
  useOrdersRealtime(Boolean(accessToken))

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <nav
        aria-label="Tài khoản"
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40',
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <aside className="sticky-below-header hidden lg:sticky lg:block lg:self-start">
        <Card className="hover-lift overflow-hidden">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                {profileQuery.isPending ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile?.email ?? 'Người dùng'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.role === 'ADMIN'
                        ? 'Quản trị viên'
                        : profile?.role === 'SELLER'
                          ? 'Người bán'
                          : 'Khách hàng'}
                    </p>
                  </>
                )}
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/10'
                        : 'text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </CardContent>
        </Card>
      </aside>

      <section className="min-w-0">
        <AnimatedOutlet />
      </section>
    </div>
  )
}
