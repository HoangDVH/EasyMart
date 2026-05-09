import { Link } from 'react-router-dom'
import { useProfileQuery } from '@/features/auth/hooks/use-auth'
import { ProductCatalog } from '@/features/products/components/product-catalog'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export function HomePage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: profile, isPending: isProfilePending } = useProfileQuery(Boolean(accessToken))

  return (
    <div className="space-y-8">
      {isProfilePending && Boolean(accessToken) ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {profile?.role === 'ADMIN' ? (
        <Card>
          <CardHeader>
            <CardTitle>Trang chủ {profile?.email ? `— ${profile.email}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Các vai từ hệ thống:{' '}
              <strong>{profile.roles?.length ? profile.roles.join(', ') : profile.role}</strong>
              {profile.roles?.length ? (
                <>
                  {' '}(vai cao nhất dùng cho điều hướng:&nbsp;<strong>{profile.role}</strong>)
                </>
              ) : null}
              .
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/admin">
                <Button variant="secondary">Vào khu vực Admin</Button>
              </Link>
              {profile?.roles?.includes('SELLER') || profile?.role === 'ADMIN' ? (
                <Link to="/seller">
                  <Button variant="secondary">Vào khu vực Seller</Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ProductCatalog />
    </div>
  )
}
