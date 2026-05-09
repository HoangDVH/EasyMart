import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/app-layout'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { ProtectedRoute, RoleGuard } from '@/app/routes/guards'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { HomePage } from '@/features/dashboard/pages/home-page'
import { AdminPage } from '@/features/dashboard/pages/admin-page'
import { SellerDashboardPage } from '@/features/seller/pages/seller-dashboard-page'
import { CartPage } from '@/features/cart/pages/cart-page'
import { CheckoutPage } from '@/features/cart/pages/checkout-page'
import { ProductDetailPage } from '@/features/products/pages/product-detail-page'
import { AccountLayout } from '@/features/account/pages/account-layout'
import { ProfilePage } from '@/features/account/pages/profile-page'
import { MyOrdersPage } from '@/features/orders/pages/my-orders-page'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/cart', element: <CartPage /> },
          { path: '/checkout', element: <CheckoutPage /> },
          {
            path: '/account',
            element: <AccountLayout />,
            children: [
              { index: true, element: <ProfilePage /> },
              { path: 'orders', element: <MyOrdersPage /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [{ path: '/admin', element: <AdminPage /> }],
          },
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'SELLER']} />,
            children: [{ path: '/seller', element: <SellerDashboardPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
