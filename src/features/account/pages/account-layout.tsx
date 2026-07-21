import { NavLink } from 'react-router-dom'
import { CreditCard, MapPin, Receipt, UserCog } from 'lucide-react'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { isGoogleAvatarUrl } from '@/features/auth/lib/user-display'
import { useAuthStore } from '@/shared/stores/auth-store'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { AnimatedOutlet } from '@/shared/ui/page-transition'
import { UserAvatar } from '@/shared/ui/user-avatar'

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
    to: '/account/addresses',
    label: 'Sổ địa chỉ',
    icon: MapPin,
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

function roleLabel(role: string | undefined) {
  if (role === 'ADMIN') return 'Quản trị viên'
  if (role === 'SELLER') return 'Người bán'
  return 'Khách hàng'
}

export function AccountLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const profile = profileQuery.data
  const linkedGoogle = isGoogleAvatarUrl(profile?.avatarUrl)

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
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40',
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
              {profileQuery.isPending ? (
                <>
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </>
              ) : (
                <>
                  <UserAvatar
                    fullName={profile?.fullName}
                    email={profile?.email}
                    avatarUrl={profile?.avatarUrl}
                    size="md"
                    showGoogleBadge={linkedGoogle}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {profile?.fullName || profile?.email || 'Người dùng'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {profile?.fullName ? profile.email : null}
                      {profile?.fullName ? ' · ' : null}
                      {roleLabel(profile?.role)}
                    </p>
                    {linkedGoogle ? (
                      <p className="mt-1 text-[11px] font-medium text-emerald-700">Google đã kết nối</p>
                    ) : null}
                  </div>
                </>
              )}
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
