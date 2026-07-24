import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/app-layout'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { DashboardLayout } from '@/app/layouts/dashboard-layout'
import { ProtectedRoute, RoleGuard } from '@/app/routes/guards'
import { RouteErrorBoundary } from '@/shared/ui/route-error-boundary'
import {
  AccountLayout,
  AddressesPage,
  AdminPage,
  CartPage,
  CheckoutPage,
  ForgotPasswordPage,
  HomePage,
  LoginPage,
  MyOrdersPage,
  MyPaymentsPage,
  OrderDetailPage,
  OrderSuccessPage,
  PaymentResultPage,
  PolicyPage,
  ProductDetailPage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  SellerOrderDetailPage,
  SellerOrdersPage,
  SellerOverviewPage,
  SellerPaymentsPage,
  SellerProductsPage,
} from '@/app/routes/lazy-pages'

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    /** Link trong email backend trỏ về /reset-password?token=... (không có prefix /auth). */
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    /** Seller/Admin: shell dashboard riêng — không dùng navbar/footer cửa hàng. */
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <RoleGuard allowedRoles={['ADMIN', 'SELLER']} />,
        children: [
          {
            path: '/seller',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <SellerOverviewPage /> },
              { path: 'products', element: <SellerProductsPage /> },
              { path: 'orders', element: <SellerOrdersPage /> },
              { path: 'orders/:id', element: <SellerOrderDetailPage /> },
              { path: 'payments', element: <SellerPaymentsPage /> },
              { path: 'account', element: <ProfilePage /> },
              { path: 'account/addresses', element: <AddressesPage /> },
            ],
          },
        ],
      },
      {
        element: <RoleGuard allowedRoles={['ADMIN']} />,
        children: [
          {
            path: '/admin',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <AdminPage /> },
              { path: 'account', element: <ProfilePage /> },
              { path: 'account/addresses', element: <AddressesPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products/:id', element: <ProductDetailPage /> },
      { path: '/policies/:slug', element: <PolicyPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/payment/result', element: <PaymentResultPage /> },
      { path: '/checkout/success/:orderId', element: <OrderSuccessPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/checkout', element: <CheckoutPage /> },
          {
            path: '/account',
            element: <AccountLayout />,
            children: [
              { index: true, element: <ProfilePage /> },
              { path: 'addresses', element: <AddressesPage /> },
              { path: 'orders', element: <MyOrdersPage /> },
              { path: 'orders/:id', element: <OrderDetailPage /> },
              { path: 'payments', element: <MyPaymentsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])