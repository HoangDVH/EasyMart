import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="rounded-md bg-primary-foreground px-3 py-1.5 text-sm font-bold tracking-wide text-primary shadow-sm"
          >
            EasyMart
          </Link>
          <span className="text-sm text-primary-foreground/85">
            Mua sắm an toàn — Giá tốt mỗi ngày
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center text-xs text-primary-foreground/85 sm:text-sm">
          © {new Date().getFullYear()} EasyMart — Chào mừng bạn quay lại
        </div>
      </footer>
    </div>
  )
}
