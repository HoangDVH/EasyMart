import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

const POLICIES: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  returns: {
    title: 'Chính sách đổi trả',
    sections: [
      {
        heading: 'Điều kiện đổi trả',
        body: 'Sản phẩm còn nguyên tem, nhãn, chưa qua sử dụng và trong vòng 7 ngày kể từ khi nhận hàng (trừ hàng khuyến mãi đặc biệt).',
      },
      {
        heading: 'Quy trình',
        body: 'Liên hệ hotline 1900 1234 hoặc email support@easymart.vn, cung cấp mã đơn hàng và lý do đổi trả. EasyMart sẽ hướng dẫn gửi hàng về kho trong 3 ngày làm việc.',
      },
      {
        heading: 'Hoàn tiền',
        body: 'Hoàn tiền trong 5–7 ngày làm việc sau khi nhận và kiểm tra hàng trả về. Thanh toán COD được hoàn qua chuyển khoản.',
      },
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật',
    sections: [
      {
        heading: 'Thu thập thông tin',
        body: 'EasyMart thu thập email, số điện thoại và địa chỉ giao hàng khi bạn đặt mua để xử lý đơn hàng và liên hệ khi cần.',
      },
      {
        heading: 'Sử dụng dữ liệu',
        body: 'Thông tin chỉ dùng cho mục đích giao dịch, hỗ trợ khách hàng và cải thiện dịch vụ. Không bán hoặc chia sẻ cho bên thứ ba ngoài đối tác vận chuyển.',
      },
      {
        heading: 'Bảo mật',
        body: 'Mật khẩu được mã hoá phía server. Phiên đăng nhập dùng token và cookie bảo mật theo tiêu chuẩn ngành.',
      },
    ],
  },
  shipping: {
    title: 'Vận chuyển & giao hàng',
    sections: [
      {
        heading: 'Phạm vi giao hàng',
        body: 'Giao toàn quốc qua đối tác vận chuyển. Thời gian 2–5 ngày làm việc tùy khu vực.',
      },
      {
        heading: 'Phí vận chuyển',
        body: 'Miễn phí vận chuyển cho đơn từ 500.000đ (theo chương trình khuyến mãi trên trang chủ). Đơn dưới mức này tính phí theo khu vực.',
      },
      {
        heading: 'Theo dõi đơn',
        body: 'Xem trạng thái trong mục Đơn mua sau khi đặt hàng thành công. Liên hệ hotline nếu quá thời gian dự kiến.',
      },
    ],
  },
}

export function PolicyPage() {
  const { slug } = useParams()
  const policy = slug ? POLICIES[slug] : null

  if (!policy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không tìm thấy trang</CardTitle>
        </CardHeader>
        <CardContent>
          <Link to="/">
            <Button variant="outline">Về trang chủ</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Về trang chủ
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{policy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-sm font-semibold">{section.heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
