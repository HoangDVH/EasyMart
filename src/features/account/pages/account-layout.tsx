import { NavLink, Outlet } from 'react-router-dom'
import { Receipt, UserCog, UserRound } from 'lucide-react'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { useAuthStore } from '@/shared/stores/auth-store'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

type NavItem = {
  to: string
  label: string
  icon: typeof UserCog
  end?: boolean
}

const navItems: NavItem[] = [
  {
    to: '/account',
    label: 'Tài khoản của tôi',
    icon: UserCog,
    end: true,
  },
  {
    to: '/account/orders',
    label: 'Đơn mua',
    icon: Receipt,
  },
]

export function AccountLayout() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const profileQuery = useProfileQuery(Boolean(accessToken))
  const profile = profileQuery.data

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
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
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
        <Outlet />
      </section>
    </div>
  )
}
