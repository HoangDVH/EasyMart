import { CreditCard, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const GUARANTEES = [
  {
    icon: ShieldCheck,
    title: 'Hàng chính hãng',
    desc: 'Cam kết nguồn gốc rõ ràng từ nhà cung cấp',
  },
  {
    icon: RotateCcw,
    title: 'Đổi trả 7 ngày',
    desc: 'Miễn phí đổi trả nếu lỗi / giao sai',
  },
  {
    icon: Truck,
    title: 'Giao hàng toàn quốc',
    desc: 'Theo dõi vận đơn đến khi nhận hàng',
  },
  {
    icon: CreditCard,
    title: 'Thanh toán an toàn',
    desc: 'COD hoặc VNPay qua cổng bảo mật',
  },
] as const

type ProductServiceGuaranteesProps = {
  className?: string
}

export function ProductServiceGuarantees({ className }: ProductServiceGuaranteesProps) {
  return (
    <section
      className={cn(
        'grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-5 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:p-0',
        className,
      )}
      aria-label="Chính sách mua hàng"
    >
      {GUARANTEES.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex gap-3.5 rounded-lg bg-muted/20 p-4 lg:rounded-none lg:bg-transparent lg:px-5 lg:py-5"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
