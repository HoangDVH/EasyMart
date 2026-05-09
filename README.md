# Ecommerce Shop (Frontend)

Frontend e-commerce build bằng React + TypeScript + Vite.

## Tech stack

- React 19
- TypeScript
- Vite 8
- React Router
- TanStack Query
- Axios
- Zustand
- React Toastify

## Features chính

- Đăng ký, đăng nhập, khôi phục phiên
- Catalog sản phẩm:
  - tìm kiếm
  - lọc theo danh mục
  - lọc theo giá/rating/giảm giá/còn hàng (đẩy qua backend filter)
  - phân trang
- Giỏ hàng + đặt hàng
- Seller:
  - quản lý sản phẩm (CRUD)
  - upload ảnh
  - lịch sử đơn liên quan sản phẩm
- Admin:
  - quản lý user
  - tạo/xóa user
  - reset mật khẩu user
  - phân role USER/SELLER/ADMIN

## Yêu cầu môi trường

- Node.js 18+ (khuyến nghị 20+)
- npm 9+

## Cài đặt và chạy local

```bash
npm install
npm run dev
```

App chạy mặc định tại `http://localhost:5173`.

## Biến môi trường

Tạo file `.env`:

```env
VITE_API_BASE_URL=https://javabackend-olfp.onrender.com
# Optional:
# VITE_PUBLIC_ASSET_BASE_URL=
# VITE_PRODUCTS_API_BASE=/api/v1/products
# VITE_CATEGORIES_API_BASE=/api/v1/categories
```

## Scripts

- `npm run dev`: chạy môi trường development
- `npm run build`: build production
- `npm run preview`: preview bản build local
- `npm run lint`: chạy eslint

## Deploy Vercel

1. Import repo lên Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variables tương tự `.env`.

## Lưu ý

- App dùng protected routes cho các khu vực `admin` và `seller`.
- Một số warning chunk size của Vite là bình thường ở giai đoạn hiện tại.
