export type VnpayReturnParams = {
  responseCode: string | null
  txnRef: string | null
  amount: number | null
  transactionNo: string | null
  bankCode: string | null
  payDate: string | null
  orderInfo: string | null
}

const VNPAY_PENDING_ORDER_KEY = 'easymart-vnpay-pending-order'
const VNPAY_CHECKOUT_PENDING_KEY = 'easymart-vnpay-checkout-pending'
const VNPAY_TXN_REF_PREFIX = 'easymart-vnpay-txn:'
const VNPAY_ORDER_COOKIE = 'easymart_vnpay_order'
const PENDING_TTL_MS = 2 * 60 * 60 * 1000
const PENDING_COOKIE_MAX_AGE_SEC = 2 * 60 * 60

function normalizeOrderId(orderId: string | number): string {
  const id = String(orderId).trim()
  return id.length > 0 ? id : ''
}

export function saveVnpayOrderCookie(orderId: string) {
  const id = normalizeOrderId(orderId)
  if (!id) return
  try {
    document.cookie = `${VNPAY_ORDER_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${PENDING_COOKIE_MAX_AGE_SEC}; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

export function loadVnpayOrderCookie(): string | null {
  try {
    const prefix = `${VNPAY_ORDER_COOKIE}=`
    for (const part of document.cookie.split(';')) {
      const trimmed = part.trim()
      if (trimmed.startsWith(prefix)) {
        const value = decodeURIComponent(trimmed.slice(prefix.length))
        return value.length > 0 ? value : null
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function clearVnpayOrderCookie() {
  try {
    document.cookie = `${VNPAY_ORDER_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

export function saveVnpayPendingOrderId(orderId: string) {
  const id = normalizeOrderId(orderId)
  if (!id) return
  saveVnpayOrderCookie(id)
  try {
    sessionStorage.setItem(VNPAY_PENDING_ORDER_KEY, id)
    localStorage.setItem(VNPAY_PENDING_ORDER_KEY, id)
  } catch {
    /* ignore */
  }
}

export function markVnpayCheckoutPending(orderId: string) {
  const id = normalizeOrderId(orderId)
  if (!id) return
  saveVnpayPendingOrderId(id)
  try {
    localStorage.setItem(
      VNPAY_CHECKOUT_PENDING_KEY,
      JSON.stringify({ orderId: id, at: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

export function loadVnpayCheckoutPending(): { orderId: string; at: number } | null {
  try {
    const raw = localStorage.getItem(VNPAY_CHECKOUT_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { orderId?: string; at?: number }
    if (typeof parsed.orderId !== 'string' || parsed.orderId.length === 0) return null
    const at = typeof parsed.at === 'number' ? parsed.at : 0
    if (Date.now() - at > PENDING_TTL_MS) return null
    return { orderId: parsed.orderId, at }
  } catch {
    return null
  }
}

export function isVnpayCheckoutPending(): boolean {
  return loadVnpayCheckoutPending() != null
}

export function clearVnpayCheckoutPending() {
  try {
    localStorage.removeItem(VNPAY_CHECKOUT_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function saveVnpayTxnRefOrderId(txnRef: string, orderId: string) {
  try {
    localStorage.setItem(`${VNPAY_TXN_REF_PREFIX}${txnRef}`, orderId)
  } catch {
    /* ignore */
  }
}

export function loadVnpayPendingOrderId(): string | null {
  try {
    return (
      sessionStorage.getItem(VNPAY_PENDING_ORDER_KEY) ??
      localStorage.getItem(VNPAY_PENDING_ORDER_KEY) ??
      loadVnpayCheckoutPending()?.orderId ??
      loadVnpayOrderCookie() ??
      null
    )
  } catch {
    return loadVnpayOrderCookie()
  }
}

export function loadOrderIdByTxnRef(txnRef: string | null): string | null {
  if (!txnRef) return null
  try {
    const id = localStorage.getItem(`${VNPAY_TXN_REF_PREFIX}${txnRef}`)
    return id && id.length > 0 ? id : null
  } catch {
    return null
  }
}

export function clearVnpayPendingOrderId() {
  try {
    sessionStorage.removeItem(VNPAY_PENDING_ORDER_KEY)
    localStorage.removeItem(VNPAY_PENDING_ORDER_KEY)
  } catch {
    /* ignore */
  }
}

export function clearVnpaySession() {
  clearVnpayPendingOrderId()
  clearVnpayCheckoutPending()
  clearVnpayOrderCookie()
}

export function buildOrderSuccessPath(orderId: string): string {
  return `/checkout/success/${encodeURIComponent(normalizeOrderId(orderId))}`
}

/** Đọc query từ search hoặc hash (một số redirect đặt params sau #). */
export function readVnpaySearchFromLocation(loc: Pick<Location, 'search' | 'hash'>): string {
  if (loc.search && isVnpayReturnUrl(loc.search)) return loc.search
  const hash = loc.hash ?? ''
  if (!hash) return loc.search
  const hashQuery = hash.startsWith('#?') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash
  if (isVnpayReturnUrl(hashQuery) || hashQuery.includes('vnp_')) {
    return hashQuery.startsWith('?') ? hashQuery : `?${hashQuery}`
  }
  return loc.search
}

export function parseVnpayReturnParams(search: string): VnpayReturnParams {
  const normalized = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalized)
  const amountRaw = params.get('vnp_Amount')
  const amount = amountRaw != null ? Number(amountRaw) / 100 : null
  return {
    responseCode: params.get('vnp_ResponseCode'),
    txnRef: params.get('vnp_TxnRef'),
    amount: amount != null && Number.isFinite(amount) ? amount : null,
    transactionNo: params.get('vnp_TransactionNo'),
    bankCode: params.get('vnp_BankCode'),
    payDate: params.get('vnp_PayDate'),
    orderInfo: params.get('vnp_OrderInfo'),
  }
}

export function parseOrderIdFromVnpayReturn(vnpay: VnpayReturnParams): string | null {
  const fromTxn = loadOrderIdByTxnRef(vnpay.txnRef)
  if (fromTxn) return fromTxn

  const txnRef = vnpay.txnRef?.trim() ?? ''
  const emMatch = /^EM(\d+)/i.exec(txnRef)
  if (emMatch?.[1]) return emMatch[1]

  const info = vnpay.orderInfo?.trim() ?? ''
  if (info.length > 0) {
    const labeled = /(?:order|don|dh|hang)[^\d]*(\d{1,12})/i.exec(info)
    if (labeled?.[1]) return labeled[1]
    const trailing = /(\d{1,12})\s*$/.exec(info)
    if (trailing?.[1]) return trailing[1]
  }

  return null
}

export function resolveVnpayOrderId(vnpay: VnpayReturnParams, search = ''): string | null {
  const normalized = search.startsWith('?') ? search.slice(1) : search
  const orderIdFromQuery = new URLSearchParams(normalized).get('orderId')
  if (orderIdFromQuery?.trim()) return orderIdFromQuery.trim()
  return loadVnpayPendingOrderId() ?? parseOrderIdFromVnpayReturn(vnpay)
}

export function isVnpayReturnUrl(search: string): boolean {
  const normalized = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(normalized)
  return params.has('vnp_ResponseCode') || params.has('vnp_TxnRef')
}

export function isVnpaySuccess(responseCode: string | null): boolean {
  return responseCode === '00' || responseCode === '07'
}

export function isVnpayFailure(responseCode: string | null): boolean {
  if (!responseCode) return false
  return !isVnpaySuccess(responseCode)
}

/**
 * Chạy TRƯỚC React Router — xử lý return URL khi backend/VNPay redirect về `/` không kèm params.
 */
export function bootstrapVnpayReturnRedirect(): void {
  if (typeof window === 'undefined') return

  const { pathname } = window.location
  const search = readVnpaySearchFromLocation(window.location)
  const hasVnp = isVnpayReturnUrl(search)

  if (hasVnp) {
    const vnpay = parseVnpayReturnParams(search)
    const orderId = resolveVnpayOrderId(vnpay, search)

    if (isVnpaySuccess(vnpay.responseCode) && orderId) {
      const target = buildOrderSuccessPath(orderId)
      if (pathname !== target && !pathname.startsWith('/checkout/success/')) {
        window.location.replace(target)
        return
      }
    }

    if (pathname !== '/payment/result') {
      window.location.replace(`/payment/result${search.startsWith('?') ? search : `?${search}`}`)
      return
    }
    return
  }

  if (pathname.startsWith('/checkout/success/') || pathname === '/payment/result') return

  const pendingOrderId = loadVnpayCheckoutPending()?.orderId ?? loadVnpayOrderCookie()
  if (!pendingOrderId) return

  if (pathname === '/' || pathname === '') {
    window.location.replace(buildOrderSuccessPath(pendingOrderId))
  }
}

export function vnpayResponseMessage(responseCode: string | null): string {
  switch (responseCode) {
    case '00':
      return 'Giao dịch thanh toán thành công.'
    case '07':
      return 'Thanh toán thành công. Giao dịch đang được xác minh.'
    case '09':
      return 'Thẻ hoặc tài khoản chưa đăng ký dịch vụ Internet Banking.'
    case '10':
      return 'Xác thực thông tin thẻ/tài khoản không đúng quá số lần cho phép.'
    case '11':
      return 'Đã hết thời gian chờ thanh toán.'
    case '12':
      return 'Thẻ hoặc tài khoản bị khóa.'
    case '13':
      return 'Mã OTP xác thực không đúng.'
    case '24':
      return 'Bạn đã hủy giao dịch trên cổng VNPay.'
    case '51':
      return 'Tài khoản không đủ số dư để thanh toán.'
    case '99':
      return 'Giao dịch không thành công. Vui lòng thử lại.'
    default:
      return responseCode
        ? `Giao dịch không thành công (mã ${responseCode}).`
        : 'Không nhận được kết quả từ VNPay.'
  }
}
