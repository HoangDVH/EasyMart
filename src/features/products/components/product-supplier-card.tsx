import { MapPin, MessageCircle, ShieldCheck, Store, UserPlus } from 'lucide-react'
import { toast } from 'react-toastify'
import type { ProductSupplierMock } from '@/features/products/lib/product-promo-mock'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

type ProductSupplierCardProps = {
  supplier: ProductSupplierMock
  className?: string
}

export function ProductSupplierCard({ supplier, className }: ProductSupplierCardProps) {
  const initial = supplier.name.trim().charAt(0).toUpperCase() || 'E'

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm',
        className,
      )}
      aria-labelledby="product-supplier-title"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className={cn(
              'grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-primary-foreground shadow-sm',
              supplier.isOfficial
                ? 'bg-gradient-to-br from-primary to-primary/80'
                : 'bg-gradient-to-br from-slate-600 to-slate-800',
            )}
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="product-supplier-title" className="truncate text-base font-semibold">
                {supplier.name}
              </h2>
              {supplier.isOfficial ? (
                <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Official
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Store className="h-3 w-3" aria-hidden />
                  Nhà cung cấp
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{supplier.handle}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {supplier.location} · Tham gia {supplier.joinedLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info('Tính năng chat với shop đang được phát triển.')}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Chat
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.success(`Đã theo dõi ${supplier.name} (minh họa).`)}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Theo dõi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t bg-border/60 sm:grid-cols-4">
        <Stat label="Đánh giá" value={supplier.rating.toFixed(1)} />
        <Stat label="Phản hồi" value={supplier.responseRate} />
        <Stat label="Người theo dõi" value={supplier.followerCount} />
        <Stat label="Sản phẩm" value={supplier.productCount} />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-4 text-center sm:py-5">
      <p className="text-sm font-semibold text-foreground sm:text-base">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
