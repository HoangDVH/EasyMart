import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { authApi } from '@/features/auth/api/auth.api'
import { useGoogleLoginMutation } from '@/features/auth/hooks/use-auth'
import {
  loadGoogleIdentityScript,
  type GoogleCredentialResponse,
} from '@/features/auth/lib/load-google-identity'
import { env } from '@/shared/config/env'
import { getApiErrorMessage } from '@/shared/lib/api-error'
import { resolvePostLoginPath } from '@/shared/lib/auth-redirect'
import { cn } from '@/shared/lib/utils'
import { FullPageSpinner } from '@/shared/ui/full-page-spinner'

type GoogleSignInButtonProps = {
  /** Ngữ cảnh GIS: đăng nhập hoặc đăng ký */
  context?: 'signin' | 'signup'
  successMessage?: string
  className?: string
  disabled?: boolean
}

export function GoogleSignInButton({
  context = 'signin',
  successMessage = 'Đăng nhập Google thành công!',
  className,
  disabled = false,
}: GoogleSignInButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const googleMutation = useGoogleLoginMutation()
  const buttonHostRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const clientId = env.GOOGLE_CLIENT_ID
  const isBusy = googleMutation.isPending || isRedirecting

  const onCredentialRef = useRef<(response: GoogleCredentialResponse) => void>(() => {})

  onCredentialRef.current = async (response: GoogleCredentialResponse) => {
    const idToken = response.credential?.trim()
    if (!idToken) {
      toast.error('Không nhận được Google credential.')
      return
    }
    try {
      await googleMutation.mutateAsync({ idToken })
      setIsRedirecting(true)
      const profile = await authApi.getProfile()
      toast.success(successMessage)
      const redirect = resolvePostLoginPath(
        location.search,
        (location.state as { from?: { pathname: string; search?: string; hash?: string } } | null)
          ?.from,
        profile.role,
      )
      navigate(redirect, { replace: true })
    } catch (error) {
      setIsRedirecting(false)
      toast.error(getApiErrorMessage(error, 'Đăng nhập Google thất bại. Thử lại sau.'))
    }
  }

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    void loadGoogleIdentityScript()
      .then(() => {
        if (!cancelled) setScriptReady(true)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setScriptError(error instanceof Error ? error.message : 'Không tải được Google Identity.')
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId || !scriptReady || disabled) return
    const host = buttonHostRef.current
    const gsi = window.google?.accounts?.id
    if (!host || !gsi) return

    const parent = host.parentElement
    let lastWidth = 0
    let initialized = false

    const render = () => {
      const measured = Math.round(host.clientWidth || parent?.clientWidth || 0)
      if (measured < 40) return
      const width = Math.min(Math.max(measured, 200), 400)
      if (Math.abs(width - lastWidth) < 2 && host.childElementCount > 0) return
      lastWidth = width

      if (!initialized) {
        gsi.initialize({
          client_id: clientId,
          callback: (response) => {
            void onCredentialRef.current(response)
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          context,
        })
        initialized = true
      }

      host.innerHTML = ''
      gsi.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: context === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width,
        locale: 'vi',
      })
    }

    render()
    const observer = parent ? new ResizeObserver(() => render()) : null
    if (parent && observer) observer.observe(parent)
    window.addEventListener('resize', render)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', render)
      host.innerHTML = ''
    }
  }, [clientId, scriptReady, disabled, context])

  if (!clientId) {
    return (
      <p
        className={cn(
          'rounded-md border border-dashed px-3 py-2 text-center text-xs text-muted-foreground',
          className,
        )}
      >
        Chưa cấu hình <code className="text-[11px]">VITE_GOOGLE_CLIENT_ID</code>
      </p>
    )
  }

  if (scriptError) {
    return (
      <p
        className={cn(
          'rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-xs text-destructive',
          className,
        )}
      >
        {scriptError}
      </p>
    )
  }

  return (
    <>
      {isBusy ? (
        <FullPageSpinner
          message={context === 'signup' ? 'Đang đăng ký bằng Google...' : 'Đang đăng nhập bằng Google...'}
        />
      ) : null}
      <div className={cn('relative w-full', className)}>
        <div
          ref={buttonHostRef}
          className={cn(
            'flex min-h-10 w-full justify-center overflow-hidden',
            (disabled || isBusy) && 'pointer-events-none opacity-60',
          )}
          aria-busy={isBusy}
        />
        {!scriptReady || isBusy ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-card/80">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Đang xử lý Google…</span>
          </div>
        ) : null}
      </div>
    </>
  )
}

type AuthGoogleSectionProps = {
  context?: 'signin' | 'signup'
  successMessage?: string
  disabled?: boolean
}

/** Divider + nút Google dùng chung login/register. */
export function AuthGoogleSection({
  context = 'signin',
  successMessage,
  disabled,
}: AuthGoogleSectionProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-card px-3 text-muted-foreground">Hoặc</span>
        </div>
      </div>
      <GoogleSignInButton
        context={context}
        successMessage={successMessage}
        disabled={disabled}
      />
    </div>
  )
}
