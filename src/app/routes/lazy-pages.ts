import { lazyPage } from '@/shared/lib/lazy-page'

export const HomePage = lazyPage(
  () => import('@/features/dashboard/pages/home-page'),
  'HomePage',
)
export const PolicyPage = lazyPage(
  () => import('@/features/dashboard/pages/policy-page'),
  'PolicyPage',
)
export const AdminPage = lazyPage(
  () => import('@/features/dashboard/pages/admin-page'),
  'AdminPage',
)

export const LoginPage = lazyPage(
  () => import('@/features/auth/pages/login-page'),
  'LoginPage',
)
export const RegisterPage = lazyPage(
  () => import('@/features/auth/pages/register-page'),
  'RegisterPage',
)
export const ForgotPasswordPage = lazyPage(
  () => import('@/features/auth/pages/forgot-password-page'),
  'ForgotPasswordPage',
)
export const ResetPasswordPage = lazyPage(
  () => import('@/features/auth/pages/reset-password-page'),
  'ResetPasswordPage',
)

export const ProductDetailPage = lazyPage(
  () => import('@/features/products/pages/product-detail-page'),
  'ProductDetailPage',
)

export const CartPage = lazyPage(
  () => import('@/features/cart/pages/cart-page'),
  'CartPage',
)
export const CheckoutPage = lazyPage(
  () => import('@/features/cart/pages/checkout-page'),
  'CheckoutPage',
)
export const OrderSuccessPage = lazyPage(
  () => import('@/features/cart/pages/order-success-page'),
  'OrderSuccessPage',
)

export const AccountLayout = lazyPage(
  () => import('@/features/account/pages/account-layout'),
  'AccountLayout',
)
export const ProfilePage = lazyPage(
  () => import('@/features/account/pages/profile-page'),
  'ProfilePage',
)
export const AddressesPage = lazyPage(
  () => import('@/features/account/pages/addresses-page'),
  'AddressesPage',
)

export const MyOrdersPage = lazyPage(
  () => import('@/features/orders/pages/my-orders-page'),
  'MyOrdersPage',
)
export const OrderDetailPage = lazyPage(
  () => import('@/features/orders/pages/order-detail-page'),
  'OrderDetailPage',
)

export const PaymentResultPage = lazyPage(
  () => import('@/features/payments/pages/payment-result-page'),
  'PaymentResultPage',
)
export const MyPaymentsPage = lazyPage(
  () => import('@/features/payments/pages/my-payments-page'),
  'MyPaymentsPage',
)

export const SellerOverviewPage = lazyPage(
  () => import('@/features/seller/pages/seller-overview-page'),
  'SellerOverviewPage',
)
export const SellerProductsPage = lazyPage(
  () => import('@/features/seller/pages/seller-products-page'),
  'SellerProductsPage',
)
export const SellerOrdersPage = lazyPage(
  () => import('@/features/seller/pages/seller-orders-page'),
  'SellerOrdersPage',
)
export const SellerOrderDetailPage = lazyPage(
  () => import('@/features/seller/pages/seller-order-detail-page'),
  'SellerOrderDetailPage',
)
export const SellerPaymentsPage = lazyPage(
  () => import('@/features/seller/pages/seller-payments-page'),
  'SellerPaymentsPage',
)
