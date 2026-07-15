/**
 * Chạy đồng bộ trước React — redirect VNPay return càng sớm càng tốt.
 * Logic tương ứng src/features/payments/lib/vnpay-return.ts
 */
;(function () {
  try {
    var loc = window.location
    var path = loc.pathname || '/'
    var search = loc.search || ''
    var hash = loc.hash || ''

    function hasVnp(s) {
      return s.indexOf('vnp_ResponseCode') >= 0 || s.indexOf('vnp_TxnRef') >= 0
    }

    var vnpSearch = search
    if (!hasVnp(vnpSearch) && hash) {
      var hashQuery = hash.charAt(0) === '#' && hash.charAt(1) === '?' ? hash.slice(2) : hash.slice(1)
      if (hasVnp(hashQuery) || hashQuery.indexOf('vnp_') >= 0) {
        vnpSearch = hashQuery.charAt(0) === '?' ? hashQuery : '?' + hashQuery
      }
    }
    if (vnpSearch && vnpSearch.charAt(0) !== '?') vnpSearch = '?' + vnpSearch

    function getParam(name, s) {
      var q = s.charAt(0) === '?' ? s.slice(1) : s
      var pairs = q.split('&')
      for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split('=')
        if (decodeURIComponent(kv[0] || '') === name) {
          return decodeURIComponent((kv[1] || '').replace(/\+/g, ' '))
        }
      }
      return null
    }

    function loadPendingOrderId() {
      try {
        var raw = localStorage.getItem('easymart-vnpay-checkout-pending')
        if (raw) {
          var p = JSON.parse(raw)
          if (p && p.orderId && p.at && Date.now() - p.at < 7200000) return String(p.orderId)
        }
      } catch (e) {}

      try {
        var prefix = 'easymart_vnpay_order='
        var parts = document.cookie.split(';')
        for (var i = 0; i < parts.length; i++) {
          var trimmed = parts[i].replace(/^\s+/, '')
          if (trimmed.indexOf(prefix) === 0) {
            var val = decodeURIComponent(trimmed.slice(prefix.length))
            if (val) return val
          }
        }
      } catch (e) {}

      try {
        return (
          sessionStorage.getItem('easymart-vnpay-pending-order') ||
          localStorage.getItem('easymart-vnpay-pending-order')
        )
      } catch (e) {}

      return null
    }

    function resolveOrderId(s) {
      var fromQuery = getParam('orderId', s)
      if (fromQuery) return fromQuery

      var pending = loadPendingOrderId()
      if (pending) return pending

      var txnRef = getParam('vnp_TxnRef', s) || ''
      var em = /^EM(\d+)/i.exec(txnRef)
      if (em && em[1]) return em[1]

      try {
        var mapped = localStorage.getItem('easymart-vnpay-txn:' + txnRef)
        if (mapped) return mapped
      } catch (e) {}

      var info = getParam('vnp_OrderInfo', s) || ''
      if (info) {
        var labeled = /(?:order|don|dh|hang)[^\d]*(\d{1,12})/i.exec(info)
        if (labeled && labeled[1]) return labeled[1]
        var trailing = /(\d{1,12})\s*$/.exec(info)
        if (trailing && trailing[1]) return trailing[1]
      }

      return null
    }

    if (vnpSearch && hasVnp(vnpSearch)) {
      var code = getParam('vnp_ResponseCode', vnpSearch)
      var success = code === '00' || code === '07'
      var orderId = resolveOrderId(vnpSearch)

      if (success && orderId) {
        var target = '/checkout/success/' + encodeURIComponent(orderId)
        if (path !== target && path.indexOf('/checkout/success/') !== 0) {
          loc.replace(target)
          return
        }
      }

      if (path !== '/payment/result') {
        loc.replace('/payment/result' + vnpSearch)
        return
      }
      return
    }

    if (path.indexOf('/checkout/success/') === 0 || path === '/payment/result') return

    var pendingId = loadPendingOrderId()
    if (pendingId && (path === '/' || path === '')) {
      loc.replace('/checkout/success/' + encodeURIComponent(pendingId))
    }
  } catch (e) {
    /* ignore */
  }
})()
