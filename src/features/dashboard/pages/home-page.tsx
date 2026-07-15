import { HomeBanner } from '@/features/dashboard/components/home-banner'
import { ProductCatalog } from '@/features/products/components/product-catalog'

export function HomePage() {
  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <HomeBanner />
      </div>
      <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
        <ProductCatalog />
      </div>
    </div>
  )
}
