import { HomeBanner } from '@/features/dashboard/components/home-banner'
import { ProductCatalog } from '@/features/products/components/product-catalog'

export function HomePage() {
  return (
    <div className="space-y-8">
      <HomeBanner />
      <ProductCatalog />
    </div>
  )
}
