# Ecommerce Shop Frontend

Ứng dụng frontend cho hệ thống thương mại điện tử **EasyMart**, xây bằng React + TypeScript + Vite.

## Tài khoản test

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Seller | `seller1@gmail.com` | `Seller@123` |
| Admin | `admin@gmail.com` | `Admin@123` |

- Seller → dashboard `/seller`
- Admin → dashboard `/admin`

### Thẻ test thanh toán VNPay (NCB)

| Trường | Giá trị |
|--------|---------|
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| Mật khẩu OTP | `123456` |

---

Luồng chính:

- người dùng mua hàng (catalog, giỏ, checkout, VNPay, sổ địa chỉ)
- seller quản lý sản phẩm & đơn bán (dashboard riêng)
- admin quản trị user và phân quyền (dashboard riêng)

---

## 1) Công nghệ sử dụng

- `react` + `react-dom`
- `typescript`
- `vite`
- `react-router-dom`
- `@tanstack/react-query`
- `axios`
- `zustand`
- `react-toastify`
- `tailwindcss`
- Google Identity Services (GIS) — đăng nhập Google
- STOMP / WebSocket — thông báo đơn realtime

---

## 2) Chức năng hiện có

### Người dùng (USER)

- Đăng ký / Đăng nhập / Đăng xuất (email + mật khẩu)
- **Đăng nhập / đăng ký bằng Google** (`POST /api/v1/auth/google`)
- Khôi phục phiên tự động (refresh cookie + `accessToken` trong `sessionStorage`)
- Hồ sơ: `fullName`, `phone`, **avatar Google** (`avatarUrl`)
- Sổ địa chỉ CRUD (`/account/addresses`)
- Catalog, tìm kiếm, lọc, chi tiết sản phẩm (ưu đãi / nhà cung cấp minh họa)
- Giỏ hàng, checkout (chọn địa chỉ, phí ship, COD / VNPay)
- Đơn mua + chi tiết + timeline trạng thái
- Thông báo đơn realtime trên navbar

### Người bán (SELLER)

- Dashboard riêng (`/seller`) — không dùng navbar/footer storefront
- Overview: KPI + biểu đồ doanh thu
- CRUD sản phẩm, upload ảnh, lọc/tìm/bulk delete
- Đơn bán: tab trạng thái, cập nhật fulfillment, chi tiết đơn + shipping
- Thông báo realtime đơn mới / cập nhật

### Quản trị (ADMIN)

- Dashboard riêng (`/admin`)
- Danh sách user, tạo user, xóa, reset mật khẩu
- Gán role `USER / SELLER / ADMIN` (độc quyền 1 role chính)

---

## 3) Cấu trúc thư mục chính

```text
src/
  app/                  # layout (storefront + dashboard), router, guards
  features/
    auth/               # login/register, Google GIS, hooks
    products/           # catalog, detail, promo UI
    cart/               # giỏ, checkout, shipping address picker
    orders/             # đơn mua, realtime
    seller/             # dashboard seller
    dashboard/          # admin page + modals
    account/            # profile, addresses, users API
    payments/           # VNPay helpers
  shared/
    api/                # axios + refresh interceptor
    stores/             # Zustand (auth, cart, notifications)
    ui/                 # UI dùng chung (avatar, toast, …)
    config/             # env
    lib/                # shipping fee, auth redirect, …
```

---

## 4) Auth model (quan trọng)

- `accessToken`: Zustand + **`sessionStorage`** (`easymart-access-token`)
- `refreshToken`: `HttpOnly cookie` (backend), FE gọi `/api/v1/auth/refresh` với `withCredentials`
- Google: FE lấy `credential` (GIS) → gửi `{ idToken }` → BE trả JWT giống login

### Khi token hết hạn

1. Request `401` → interceptor refresh
2. Refresh OK → retry request
3. Refresh fail → `clearAuth` + redirect `/auth/login?next=…`

### Redirect sau login

Ưu tiên `?next=` → `location.state.from` → theo role: `ADMIN` → `/admin`, `SELLER` → `/seller`, còn lại → `/`

### Multi-account

Refresh cookie theo browser profile/domain API — không ổn định nếu 2 account trên 2 tab cùng profile. Test bằng profile khác hoặc Incognito.

### Google Sign-In — cấu hình

1. Backend: `GOOGLE_AUTH_ENABLED=true`, `GOOGLE_CLIENT_ID=<Web Client ID>`
2. FE `.env`: `VITE_GOOGLE_CLIENT_ID` **trùng** client ID backend
3. Google Cloud Console: thêm origin FE (vd. `http://localhost:5173`, domain Vercel) vào **Authorized JavaScript origins**

---

## 5) Yêu cầu môi trường

- Node.js `>= 18` (khuyến nghị Node 20)
- npm `>= 9`

---

## 6) Chạy local

### Bước 1: cài dependency

```bash
npm install
```

### Bước 2: tạo env

```bash
cp .env.example .env
```

Tối thiểu:

```env
VITE_API_BASE_URL=https://javabackend-olfp.onrender.com
VITE_GOOGLE_CLIENT_ID=
```

### Bước 3: chạy dev

```bash
npm run dev
```

App mặc định: `http://localhost:5173`.

---

## 7) Biến môi trường

File mẫu: `.env.example`

| Biến | Mô tả |
|------|--------|
| `VITE_API_BASE_URL` | Base URL backend |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID (trùng BE) |
| `VITE_WS_URL` | (optional) STOMP endpoint; trống → suy ra từ API |
| `VITE_PUBLIC_ASSET_BASE_URL` | (optional) host static/CDN |
| `VITE_PRODUCTS_API_BASE` | (optional) override products |
| `VITE_CATEGORIES_API_BASE` | (optional) override categories |
| `VITE_PRODUCT_IMAGES_STATIC_DIR` | (optional) path ảnh static |
| `VITE_PRODUCT_IMAGE_DOWNLOAD_API` | (optional) API download ảnh |

---

## 8) Scripts

- `npm run dev` — development
- `npm run build` — production (`tsc -b && vite build`)
- `npm run preview` — preview bản build
- `npm run lint` — eslint

---

## 9) Deploy Vercel

1. Import repo → Framework `Vite`
2. Build: `npm run build` · Output: `dist`
3. Env giống `.env` (nhớ `VITE_GOOGLE_CLIENT_ID` + Authorized origins trên Google)

`vercel.json` rewrite SPA về `index.html` (tránh 404 khi reload `/seller`, `/admin`, …).

---

## 10) Troubleshooting nhanh

### Nút Google hiện “Chưa cấu hình VITE_GOOGLE_CLIENT_ID”

- Thêm biến vào `.env` rồi **restart** `npm run dev`.

### Google login lỗi audience / origin

- Client ID FE ≠ BE, hoặc origin chưa khai báo trên Google Cloud.

### `Invalid message key`

- Message i18n từ backend, không phải text FE.

### Phí ship / địa chỉ checkout

- Ship ₫30.000; miễn phí đơn từ ₫500.000 (logic FE + BE shipping fields).
- Cần đăng nhập và có địa chỉ trong sổ địa chỉ (hoặc thêm mới tại checkout).

### Sticky filter bị header che

- FE đồng bộ `--app-header-height` từ chiều cao header thật.

---

## 11) Checklist trước khi push

- [ ] `npm run build` pass
- [ ] Không commit `.env`
- [ ] Đã cập nhật `.env.example` nếu thêm biến mới
- [ ] Test login email + Google + refresh + protected routes
- [ ] Test checkout địa chỉ / phí ship trên mobile nếu đụng UI
