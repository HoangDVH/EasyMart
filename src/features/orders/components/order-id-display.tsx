import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

export function formatShortOrderId(id: string) {
  const clean = id.replace(/-/g, '').toUpperCase()
  if (clean.length <= 8) return clean
  return clean.slice(-8)
}

type OrderIdDisplayProps = {
  id: string
  className?: string
  showCopy?: boolean
}

export function OrderIdDisplay({ id, className, showCopy = true }: OrderIdDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="font-mono text-sm" title={id}>
        #{formatShortOrderId(id)}
      </span>
      {showCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 px-0 sm:h-8 sm:w-8"
          onClick={() => void copy()}
          aria-label="Sao chép mã đơn hàng"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      ) : null}
    </span>
  )
}
