import { useEffect, useState } from 'react'
import {
  BadgePercent,
  Clock3,
  Copy,
  ShieldCheck,
  Ticket,
  Truck,
} from 'lucide-react'
import { toast } from 'react-toastify'
import type { ProductPromoMock } from '@/features/products/lib/product-promo-mock'
import { cn } from '@/shared/lib/utils'

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

function useCountdown(endsAt: Date) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt.getTime() - Date.now()))

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endsAt.getTime() - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  const totalSec = Math.floor(remaining / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return { h, m, s, expired: remaining <= 0 }
}

type ProductPromoPanelProps = {
  promo: ProductPromoMock
  discountPercent: number | null
  className?: string
}

export function ProductPromoPanel({ promo, discountPercent, className }: ProductPromoPanelProps) {
  const { h, m, s, expired } = useCountdown(promo.dealEndsAt)

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`Đã sao chép mã ${code}`)
    } catch {
      toast.info(`Mã ưu đãi: ${code}`)
    }
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3.5 py-3">
        <BadgePercent className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-primary">{promo.dealLabel}</span>
        {discountPercent != null ? (
          <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
            -{discountPercent}%
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {expired ? (
            'Đã kết thúc'
          ) : (
            <>
              Kết thúc sau
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-foreground">
                <TimeBox value={pad2(h)} />
                <span>:</span>
                <TimeBox value={pad2(m)} />
                <span>:</span>
                <TimeBox value={pad2(s)} />
              </span>
            </>
          )}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Ticket className="h-4 w-4 text-primary" aria-hidden />
          Mã giảm giá của shop
        </div>
        <div className="flex flex-wrap gap-2.5">
          {promo.vouchers.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => void copyCode(v.code)}
              title={v.detail}
              className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-primary/45 bg-primary/[0.04] px-3 py-2 text-left transition-colors hover:border-primary hover:bg-primary/10"
            >
              <span className="truncate text-xs font-semibold text-primary">{v.label}</span>
              <Copy className="h-3 w-3 shrink-0 text-primary/70 opacity-70 group-hover:opacity-100" aria-hidden />
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Nhấn mã để sao chép · Áp dụng khi thanh toán (minh họa).
        </p>
      </div>

      <dl className="space-y-0 rounded-lg border bg-muted/20 text-sm">
        <div className="flex gap-4 px-4 py-3.5">
          <dt className="flex w-24 shrink-0 items-start gap-1.5 text-muted-foreground sm:w-28">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            Vận chuyển
          </dt>
          <dd className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-foreground">
              {promo.shippingLabel} · {promo.shippingEta}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Miễn phí ship đơn từ ₫500.000 · Phí tiêu chuẩn ₫30.000
            </p>
          </dd>
        </div>
        <div className="flex gap-4 border-t border-border/60 px-4 py-3.5">
          <dt className="flex w-24 shrink-0 items-start gap-1.5 text-muted-foreground sm:w-28">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            Bảo đảm
          </dt>
          <dd className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
            Hàng chính hãng · Đổi trả 7 ngày · Hoàn tiền nếu giao sai / lỗi từ nhà bán
          </dd>
        </div>
      </dl>
    </div>
  )
}

function TimeBox({ value }: { value: string }) {
  return (
    <span className="inline-grid min-w-[1.6rem] place-items-center rounded bg-foreground px-1 py-0.5 text-[11px] leading-none text-background">
      {value}
    </span>
  )
}
