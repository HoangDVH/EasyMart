export const env = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ?? 'https://javabackend-olfp.onrender.com',
  /**
   * Nếu backend/docs ghi ảnh phục vụ ở origin khác (CDN) nhưng vẫn public — set giống Swagger.
   * Để trống → dùng luôn `API_BASE_URL` cho path bắt đầu bằng `/`.
   */
  PUBLIC_ASSET_BASE_URL: import.meta.env.VITE_PUBLIC_ASSET_BASE_URL?.trim() || undefined,
  /** WebSocket STOMP endpoint. Để trống → suy ra từ API_BASE_URL (wss://host/ws). */
  WS_URL: import.meta.env.VITE_WS_URL?.trim() || undefined,
  /**
   * Google OAuth Web Client ID — trùng `GOOGLE_CLIENT_ID` trên backend.
   * Dùng cho Google Identity Services (nút Đăng nhập với Google).
   */
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || undefined,
}
