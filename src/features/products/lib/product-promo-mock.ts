import type { Product } from '@/features/products/types/product.types'

/** Hash ổn định theo id — cùng SP luôn thấy cùng ưu đãi giả lập. */
function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type PromoVoucher = {
  id: string
  code: string
  label: string
  detail: string
}

export type ProductPromoMock = {
  vouchers: PromoVoucher[]
  shippingLabel: string
  shippingEta: string
  dealEndsAt: Date
  dealLabel: string
}

export type ProductSupplierMock = {
  name: string
  handle: string
  isOfficial: boolean
  rating: number
  responseRate: string
  followerCount: string
  productCount: string
  location: string
  joinedLabel: string
}

const VOUCHER_POOL: Omit<PromoVoucher, 'id'>[] = [
  { code: 'EASY15K', label: 'Giảm ₫15.000', detail: 'Đơn từ ₫99.000 · Áp dụng toàn gian hàng' },
  { code: 'EASY10P', label: 'Giảm 10%', detail: 'Tối đa ₫50.000 · Đơn từ ₫200.000' },
  { code: 'FREESHIP', label: 'Freeship ₫30.000', detail: 'Đơn từ ₫0 · Nội thành & tỉnh gần' },
  { code: 'NEWBUY', label: 'Giảm ₫25.000', detail: 'Cho lần mua đầu · Đơn từ ₫150.000' },
  { code: 'WEEKEND', label: 'Giảm ₫40.000', detail: 'Thứ 6–CN · Đơn từ ₫350.000' },
]

const SHIPPING_OPTIONS = [
  { label: 'Nhanh', eta: 'Nhận từ 1–2 ngày' },
  { label: 'Tiết kiệm', eta: 'Nhận từ 2–4 ngày' },
  { label: 'Hỏa tốc', eta: 'Trong ngày (nội thành)' },
]

const LOCATIONS = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Bình Dương']

function shopNameFromSeller(product: Product): { name: string; handle: string; isOfficial: boolean } {
  const email = product.sellerEmail?.trim()
  if (email) {
    const local = email.split('@')[0] ?? 'shop'
    const pretty = local
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
    return {
      name: pretty ? `${pretty} Store` : 'Gian hàng EasyMart',
      handle: `@${local.toLowerCase().replace(/\s+/g, '')}`,
      isOfficial: false,
    }
  }
  if (product.featured) {
    return { name: 'EasyMart Official', handle: '@easymart.official', isOfficial: true }
  }
  return { name: 'EasyMart Mall', handle: '@easymart.mall', isOfficial: true }
}

export function getProductPromoMock(product: Product): ProductPromoMock {
  const seed = hashSeed(product.id)
  const count = 2 + (seed % 2)
  const vouchers: PromoVoucher[] = []
  for (let i = 0; i < count; i += 1) {
    const base = VOUCHER_POOL[(seed + i * 3) % VOUCHER_POOL.length]
    vouchers.push({ ...base, id: `${product.id}-v${i}` })
  }

  const ship = SHIPPING_OPTIONS[seed % SHIPPING_OPTIONS.length]
  const hoursLeft = 6 + (seed % 18)
  const dealEndsAt = new Date(Date.now() + hoursLeft * 60 * 60 * 1000)
  const hasDiscount =
    product.price != null &&
    product.discountPrice != null &&
    product.discountPrice < product.price

  return {
    vouchers,
    shippingLabel: ship.label,
    shippingEta: ship.eta,
    dealEndsAt,
    dealLabel: hasDiscount ? 'Flash Deal' : 'Ưu đãi hôm nay',
  }
}

export function getProductSupplierMock(product: Product): ProductSupplierMock {
  const seed = hashSeed(`shop:${product.id}:${product.sellerId ?? product.sellerEmail ?? 'mall'}`)
  const shop = shopNameFromSeller(product)
  const rating = 4.5 + ((seed % 50) / 100)
  const response = 90 + (seed % 10)
  const followers = 1_200 + (seed % 80_000)
  const products = 48 + (seed % 420)

  return {
    ...shop,
    rating: Math.min(5, Number(rating.toFixed(1))),
    responseRate: `${response}%`,
    followerCount: followers >= 10_000 ? `${(followers / 1000).toFixed(1)}k` : String(followers),
    productCount: String(products),
    location: LOCATIONS[seed % LOCATIONS.length],
    joinedLabel: seed % 2 === 0 ? '2 năm trước' : '1 năm trước',
  }
}
