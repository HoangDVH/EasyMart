export const env = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ?? 'https://javabackend-olfp.onrender.com',
  /**
   * Nếu backend/docs ghi ảnh phục vụ ở origin khác (CDN) nhưng vẫn public — set giống Swagger.
   * Để trống → dùng luôn `API_BASE_URL` cho path bắt đầu bằng `/`.
   */
  PUBLIC_ASSET_BASE_URL: import.meta.env.VITE_PUBLIC_ASSET_BASE_URL?.trim() || undefined,
}
