import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { getUserInitials } from '@/features/auth/lib/user-display'
import { cn } from '@/shared/lib/utils'

type UserAvatarProps = {
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** `onPrimary` = trên nền xanh header (chữ/nền rõ) */
  tone?: 'default' | 'onPrimary'
  className?: string
  showGoogleBadge?: boolean
}

const SIZE = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-xl',
} as const

const BADGE = {
  xs: 'h-3 w-3',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
} as const

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7 12.9 19.6C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.3 5.3C39.2 37.2 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

export function UserAvatar({
  fullName,
  email,
  avatarUrl,
  size = 'md',
  tone = 'default',
  className,
  showGoogleBadge = false,
}: UserAvatarProps) {
  const initials = getUserInitials(fullName, email)
  const src = avatarUrl?.trim() || null
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = Boolean(src) && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [src])

  const ringClass =
    tone === 'onPrimary' ? 'ring-1 ring-primary-foreground/70' : 'ring-2 ring-background'

  const fallbackClass =
    tone === 'onPrimary'
      ? 'bg-primary-foreground/20 font-semibold text-primary-foreground'
      : 'bg-primary font-semibold text-primary-foreground'

  return (
    <div className={cn('relative shrink-0', className)}>
      {showImage ? (
        <img
          src={src!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={cn('rounded-full object-cover shadow-sm', ringClass, SIZE[size])}
        />
      ) : (
        <div
          className={cn(
            'grid place-items-center rounded-full shadow-sm',
            fallbackClass,
            ringClass,
            SIZE[size],
          )}
          aria-hidden
        >
          {initials.length > 0 && initials !== '?' ? (
            <span className="leading-none">{initials}</span>
          ) : (
            <UserRound className="h-[45%] w-[45%]" />
          )}
        </div>
      )}
      {showGoogleBadge ? (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-card p-0.5 shadow ring-1 ring-border',
            BADGE[size],
          )}
          title="Google"
        >
          <GoogleGIcon className="h-full w-full" />
        </span>
      ) : null}
    </div>
  )
}
