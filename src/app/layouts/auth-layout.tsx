import { Link } from 'react-router-dom'
import { AnimatedOutlet } from '@/shared/ui/page-transition'

export function AuthLayout() {
  return (
    <div className="auth-bg flex min-h-screen flex-col bg-background">
      <header className="bg-primary/95 text-primary-foreground shadow-md shadow-primary/15 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="rounded-lg bg-primary-foreground px-3 py-1.5 text-sm font-bold tracking-wide text-primary shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            EasyMart
          </Link>
          <span className="hidden text-sm text-primary-foreground/85 sm:inline">
            Mua sắm an toàn — Giá tốt mỗi ngày
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <AnimatedOutlet />
        </div>
      </main>
      <footer className="border-t border-primary-foreground/15 bg-primary/95 text-primary-foreground backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-center text-xs text-primary-foreground/85 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <span>© {new Date().getFullYear()} EasyMart</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/policies/privacy" className="transition-colors hover:text-primary-foreground hover:underline">
              Bảo mật
            </Link>
            <Link to="/policies/shipping" className="transition-colors hover:text-primary-foreground hover:underline">
              Giao hàng
            </Link>
            <a href="mailto:support@easymart.vn" className="transition-colors hover:text-primary-foreground hover:underline">
              Hỗ trợ
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
