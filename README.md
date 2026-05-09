# Ecommerce Shop Frontend

Ứng dụng frontend cho hệ thống thương mại điện tử, xây bằng React + TypeScript + Vite, tích hợp đầy đủ luồng:

- người dùng mua hàng
- seller quản lý sản phẩm
- admin quản trị user và phân quyền

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

---

## 2) Chức năng hiện có

### Người dùng (USER)

- Đăng ký / Đăng nhập / Đăng xuất
- Khôi phục phiên đăng nhập tự động
- Xem danh sách sản phẩm, chi tiết sản phẩm
- Tìm kiếm và lọc sản phẩm
- Thêm giỏ hàng, checkout, tạo đơn hàng
- Xem lịch sử đơn mua

### Người bán (SELLER)

- Truy cập khu vực `Quản lí sản phẩm`
- Tạo / sửa / xóa sản phẩm
- Upload ảnh sản phẩm
- Xem sản phẩm do chính seller tạo
- Xem lịch sử đơn liên quan sản phẩm

### Quản trị (ADMIN)

- Xem danh sách user toàn hệ thống
- Tạo user mới
- Xóa user
- Reset mật khẩu user
- Gán role `USER / SELLER / ADMIN`
- Gán role theo chế độ độc quyền (chỉ 1 role chính)

---

## 3) Cấu trúc thư mục chính

```text
src/
  app/                  # layout, router, guards
  features/
    auth/               # login/register/profile
    products/           # catalog, detail, product API
    cart/               # giỏ hàng, checkout
    orders/             # đơn hàng
    seller/             # dashboard seller + CRUD sản phẩm
    dashboard/          # admin page
    account/            # profile user + users admin API
  shared/
    api/                # axios client + interceptor refresh
    stores/             # Zustand stores
    ui/                 # UI components dùng chung
    config/             # env mapping
```

---

## 4) Auth model (quan trọng)

Mô hình xác thực hiện tại:

- `accessToken` lưu trong memory (Zustand)
- `refreshToken` lưu qua `HttpOnly cookie` ở backend
- FE refresh qua endpoint `/api/v1/auth/refresh`

### Hành vi mong đợi khi token hết hạn

- Request trả `401` -> interceptor gọi refresh
- Refresh thành công -> retry request cũ
- Refresh thất bại -> clear auth + redirect `/auth/login`

### Lưu ý multi-account

Do refresh cookie share theo browser profile/domain API:

- Không ổn định nếu đăng nhập 2 account khác nhau trên 2 tab trong cùng 1 profile
- Cách test đúng: dùng browser profile khác hoặc incognito

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

Copy file mẫu:

```bash
cp .env.example .env
```

Hoặc tạo `.env` với tối thiểu:

```env
VITE_API_BASE_URL=https://javabackend-olfp.onrender.com
```

### Bước 3: chạy dev

```bash
npm run dev
```

App mặc định chạy tại `http://localhost:5173`.

---

## 7) Biến môi trường

File mẫu: `.env.example`

- `VITE_API_BASE_URL`: base URL backend
- `VITE_PUBLIC_ASSET_BASE_URL` (optional): host static assets nếu khác API
- `VITE_PRODUCTS_API_BASE` (optional): override endpoint products
- `VITE_CATEGORIES_API_BASE` (optional): override endpoint categories
- `VITE_PRODUCT_IMAGES_STATIC_DIR` (optional): đường dẫn static images
- `VITE_PRODUCT_IMAGE_DOWNLOAD_API` (optional): API download ảnh

---

## 8) Scripts

- `npm run dev`: chạy development
- `npm run build`: build production (`tsc -b && vite build`)
- `npm run preview`: preview bản build local
- `npm run lint`: chạy eslint

---

## 9) Deploy Vercel

### Cách 1: qua dashboard Vercel

1. Import repository lên Vercel
2. Framework preset: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables giống `.env`

### Cách 2: Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

### SPA rewrite

Project đã có `vercel.json`:

- rewrite toàn bộ route về `index.html`
- tránh lỗi `404` khi reload route con (`/seller`, `/admin`, `/account/orders`, ...)

---

## 10) Troubleshooting nhanh

### `Invalid message key`

- Đây là message từ backend (i18n key không map), không phải text FE tự sinh.

### Không thấy nút `Quản lí sản phẩm` trên mobile

- Đã fix hiển thị menu mobile cho `SELLER/ADMIN`.

### Đổi role chậm

- FE đã tối ưu chỉ gọi API role khi thực sự cần thay đổi trạng thái.

### Lỗi HTML nesting (`div` inside `p`)

- Đã fix `CardDescription` render bằng `div` để tránh hydration warning.

---

## 11) Checklist trước khi push

- [ ] `npm run build` pass
- [ ] Không commit `.env`
- [ ] Đã cập nhật `.env.example` nếu thêm biến mới
- [ ] Đã test login + refresh + protected routes
