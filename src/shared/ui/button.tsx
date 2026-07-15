import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-md hover:shadow-primary/45 active:translate-y-0 active:brightness-95',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm shadow-secondary/25 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-md hover:shadow-secondary/35 active:translate-y-0',
        outline:
          'border border-input bg-background shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted hover:shadow-md active:translate-y-0',
        ghost: 'hover:bg-muted/80',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
