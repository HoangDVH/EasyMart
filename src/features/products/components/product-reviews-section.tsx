import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, MessageSquarePlus, Pencil, Star, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { useMyOrdersQuery } from '@/features/orders/hooks/use-orders'
import { isOrderPaid } from '@/features/orders/lib/fulfillment'
import { StarRating } from '@/features/products/components/star-rating'
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useProductReviewsQuery,
  useUpdateReviewMutation,
} from '@/features/products/hooks/use-reviews'
import { useProductReviewsRealtime } from '@/features/products/hooks/use-product-reviews-realtime'
import type { ProductReview } from '@/features/products/types/review.types'
import { buildLoginPath, locationToReturnTo } from '@/shared/lib/auth-redirect'
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/lib/api-error'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Skeleton } from '@/shared/ui/skeleton'
import { UserAvatar } from '@/shared/ui/user-avatar'
import { cn } from '@/shared/lib/utils'

type ProductReviewsSectionProps = {
  productId: string
  rating?: number | null
  reviewCount?: number | null
}

type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5 | 'comment'

function formatReviewTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Che tên kiểu Shopee: Nguyễn Văn A → N*******A */
function maskDisplayName(fullName: string | null, email: string) {
  const name = fullName?.trim()
  if (name && name.length > 2) {
    return `${name[0]}${'*'.repeat(Math.min(7, name.length - 2))}${name[name.length - 1]}`
  }
  const local = email.split('@')[0] ?? email
  if (local.length <= 2) return `${local[0] ?? '*'}***`
  return `${local[0]}${'*'.repeat(Math.min(6, local.length - 1))}`
}

function RatingBars({
  counts,
  total,
}: {
  counts: Record<1 | 2 | 3 | 4 | 5, number>
  total: number
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const count = counts[star]
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs text-[#757575]">
            <span className="inline-flex w-14 shrink-0 items-center gap-0.5">
              {star}
              <Star className="h-3 w-3 fill-[#ee4d2d] text-[#ee4d2d]" aria-hidden />
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f5f5f5]">
              <div
                className="h-full rounded-full bg-[#ee4d2d]/80 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewForm({
  initialRating = 5,
  initialComment = '',
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initialRating?: number
  initialComment?: string
  submitLabel: string
  pending: boolean
  onSubmit: (payload: { rating: number; comment: string }) => void
  onCancel?: () => void
}) {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)

  return (
    <form
      className="space-y-3 border border-[#ee4d2d]/20 bg-[#fff8f3] p-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ rating, comment: comment.trim() })
      }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#757575]">Chất lượng sản phẩm</p>
        <StarRating value={rating} onChange={setRating} size="lg" tone="shopee" aria-label="Chọn số sao" />
        <span className="text-sm font-medium text-[#ee4d2d]">
          {rating === 5
            ? 'Tuyệt vời'
            : rating === 4
              ? 'Hài lòng'
              : rating === 3
                ? 'Bình thường'
                : rating === 2
                  ? 'Không hài lòng'
                  : 'Tệ'}
        </span>
      </div>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này với những người mua khác nhé."
        className="w-full resize-y rounded border border-[#e8e8e8] bg-white px-3 py-2.5 text-sm text-[#222] outline-none placeholder:text-[#bdbdbd] focus:border-[#ee4d2d]"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="min-w-24 border-[#e8e8e8]"
            onClick={onCancel}
            disabled={pending}
          >
            Trở lại
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={pending || rating < 1}
          className="min-w-28 gap-2 bg-[#ee4d2d] hover:bg-[#d73211]"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function ReviewItem({
  review,
  isMine,
  onEdit,
  onDelete,
  deleting,
}: {
  review: ProductReview
  isMine: boolean
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const displayName = maskDisplayName(review.userFullName, review.userEmail)
  return (
    <article className="flex gap-3 border-b border-[#f0f0f0] py-5 last:border-b-0">
      <UserAvatar
        fullName={review.userFullName}
        email={review.userEmail}
        avatarUrl={review.userAvatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-[#000000de]">{displayName}</p>
          {isMine ? (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#ee4d2d] ring-1 ring-[#ee4d2d]/30">
              Bạn
            </span>
          ) : null}
        </div>
        <StarRating value={review.rating} readOnly size="sm" tone="shopee" />
        <p className="text-xs text-[#757575]">{formatReviewTime(review.createdAt)}</p>
        {review.comment ? (
          <p className="whitespace-pre-line pt-1 text-sm leading-6 text-[#000000de]">{review.comment}</p>
        ) : (
          <p className="pt-1 text-sm italic text-[#bdbdbd]">Không có nội dung đánh giá</p>
        )}
        {isMine ? (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#ee4d2d] hover:underline"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Sửa
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#757575] hover:text-destructive hover:underline disabled:opacity-60"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )}
              Xóa
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function ProductReviewsSection({
  productId,
  rating,
  reviewCount,
}: ProductReviewsSectionProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuthStore((s) => s.accessToken)
  const profile = useAuthStore((s) => s.user)
  const reviewsQuery = useProductReviewsQuery(productId, { page: 0, size: 50 })
  const myOrdersQuery = useMyOrdersQuery(Boolean(accessToken))
  useProductReviewsRealtime(productId, Boolean(accessToken))

  const createMutation = useCreateReviewMutation(productId)
  const updateMutation = useUpdateReviewMutation(productId)
  const deleteMutation = useDeleteReviewMutation(productId)

  const [editing, setEditing] = useState(false)
  const [writing, setWriting] = useState(false)
  const [starFilter, setStarFilter] = useState<StarFilter>('all')
  const [deleteTarget, setDeleteTarget] = useState<ProductReview | null>(null)

  const myEmail = (profile?.email ?? '').trim().toLowerCase()
  const reviews = reviewsQuery.data?.items ?? []
  const myReview = useMemo(
    () => reviews.find((item) => item.userEmail.trim().toLowerCase() === myEmail) ?? null,
    [reviews, myEmail],
  )

  const hasPurchasedPaid = useMemo(() => {
    const orders = myOrdersQuery.data ?? []
    return orders.some((order) => {
      const paid = isOrderPaid(order) || String(order.status ?? '').toUpperCase().includes('PAID')
      if (!paid) return false
      return order.items.some((item) => String(item.productId) === String(productId))
    })
  }, [myOrdersQuery.data, productId])

  const starCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>
    for (const review of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5
      counts[star] += 1
    }
    return counts
  }, [reviews])

  const withCommentCount = useMemo(
    () => reviews.filter((item) => Boolean(item.comment?.trim())).length,
    [reviews],
  )

  const filteredReviews = useMemo(() => {
    if (starFilter === 'all') return reviews
    if (starFilter === 'comment') return reviews.filter((item) => Boolean(item.comment?.trim()))
    return reviews.filter((item) => Math.round(item.rating) === starFilter)
  }, [reviews, starFilter])

  const displayCount = reviewCount ?? reviewsQuery.data?.totalElements ?? reviews.length
  const avgRating = rating ?? (reviews.length > 0
    ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
    : null)
  const checkingPurchase = Boolean(accessToken) && myOrdersQuery.isPending
  const canShowCreate =
    Boolean(accessToken) && !myReview && hasPurchasedPaid && !checkingPurchase
  const showMustPurchaseHint =
    Boolean(accessToken) && !myReview && !checkingPurchase && !hasPurchasedPaid

  const filterChips: { key: StarFilter; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 5, label: `5 Sao (${starCounts[5]})` },
    { key: 4, label: `4 Sao (${starCounts[4]})` },
    { key: 3, label: `3 Sao (${starCounts[3]})` },
    { key: 2, label: `2 Sao (${starCounts[2]})` },
    { key: 1, label: `1 Sao (${starCounts[1]})` },
    { key: 'comment', label: `Có bình luận (${withCommentCount})` },
  ]

  async function handleCreate(payload: { rating: number; comment: string }) {
    try {
      await createMutation.mutateAsync(payload)
      toast.success('Đã gửi đánh giá.')
      setWriting(false)
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 401) {
        navigate(buildLoginPath(locationToReturnTo(location)))
        return
      }
      if (status === 403) {
        toast.error('Chỉ đánh giá sau khi mua')
        return
      }
      if (status === 409) {
        toast.info('Bạn đã đánh giá sản phẩm này. Có thể sửa đánh giá bên dưới.')
        void reviewsQuery.refetch()
        setWriting(false)
        setEditing(true)
        return
      }
      toast.error(getApiErrorMessage(error, 'Không gửi được đánh giá.'))
    }
  }

  async function handleUpdate(payload: { rating: number; comment: string }) {
    if (!myReview) return
    try {
      await updateMutation.mutateAsync({ reviewId: myReview.id, payload })
      toast.success('Đã cập nhật đánh giá.')
      setEditing(false)
    } catch (error) {
      const status = getApiErrorStatus(error)
      if (status === 401) {
        navigate(buildLoginPath(locationToReturnTo(location)))
        return
      }
      toast.error(getApiErrorMessage(error, 'Không cập nhật được đánh giá.'))
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Đã xóa đánh giá.')
      setDeleteTarget(null)
      setEditing(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không xóa được đánh giá.'))
    }
  }

  return (
    <section className="overflow-hidden rounded-sm border border-[#00000014] bg-white shadow-none">
      <div className="border-b border-[#f0f0f0] px-4 py-4 sm:px-6">
        <h2 className="text-lg font-normal uppercase tracking-wide text-[#000000de]">
          Đánh giá sản phẩm
        </h2>
      </div>

      {/* Summary kiểu Shopee */}
      <div className="border-b border-[#f0f0f0] bg-[#fffbf8] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="shrink-0 text-center sm:w-36 sm:text-left">
            {avgRating != null ? (
              <>
                <p className="text-[1.75rem] font-medium leading-none text-[#ee4d2d]">
                  {avgRating.toFixed(1)}
                  <span className="ml-1 text-base font-normal text-[#ee4d2d]/80">trên 5</span>
                </p>
                <div className="mt-2 flex justify-center sm:justify-start">
                  <StarRating value={avgRating} readOnly size="md" tone="shopee" />
                </div>
                <p className="mt-2 text-xs text-[#757575]">{displayCount} đánh giá</p>
              </>
            ) : (
              <p className="text-sm text-[#757575]">Chưa có đánh giá</p>
            )}
          </div>
          <RatingBars counts={starCounts} total={reviews.length || displayCount} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={String(chip.key)}
              type="button"
              onClick={() => setStarFilter(chip.key)}
              className={cn(
                'rounded-sm border px-3 py-1.5 text-xs transition-colors sm:text-sm',
                starFilter === chip.key
                  ? 'border-[#ee4d2d] bg-white text-[#ee4d2d]'
                  : 'border-[#e8e8e8] bg-white text-[#000000de] hover:border-[#ee4d2d]/50',
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        {!accessToken ? (
          <p className="rounded-sm border border-dashed border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-sm text-[#757575]">
            <Link
              to={buildLoginPath(locationToReturnTo(location))}
              className="font-medium text-[#ee4d2d] hover:underline"
            >
              Đăng nhập
            </Link>{' '}
            để đánh giá sản phẩm (chỉ sau khi mua và thanh toán).
          </p>
        ) : null}

        {checkingPurchase ? (
          <div className="flex items-center gap-2 text-sm text-[#757575]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Đang kiểm tra điều kiện đánh giá…
          </div>
        ) : null}

        {showMustPurchaseHint ? (
          <p className="rounded-sm border border-[#ffe8e2] bg-[#fff8f3] px-4 py-3 text-sm text-[#ee4d2d]">
            Chỉ đánh giá sau khi mua
          </p>
        ) : null}

        {canShowCreate && !writing ? (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="inline-flex items-center gap-2 rounded-sm border border-[#ee4d2d] px-4 py-2 text-sm font-medium text-[#ee4d2d] transition-colors hover:bg-[#fff8f3]"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Viết đánh giá
          </button>
        ) : null}

        {canShowCreate && writing ? (
          <ReviewForm
            submitLabel="Hoàn thành"
            pending={createMutation.isPending}
            onSubmit={(payload) => void handleCreate(payload)}
            onCancel={() => setWriting(false)}
          />
        ) : null}

        {myReview && editing ? (
          <ReviewForm
            initialRating={myReview.rating}
            initialComment={myReview.comment ?? ''}
            submitLabel="Cập nhật"
            pending={updateMutation.isPending}
            onSubmit={(payload) => void handleUpdate(payload)}
            onCancel={() => setEditing(false)}
          />
        ) : null}

        {myReview && !editing ? (
          <p className="text-xs text-[#757575]">
            Bạn đã đánh giá sản phẩm này — có thể Sửa / Xóa ở đánh giá của bạn bên dưới.
          </p>
        ) : null}

        <div>
          {reviewsQuery.isPending ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviewsQuery.isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              {getApiErrorMessage(reviewsQuery.error, 'Không tải được đánh giá.')}
            </p>
          ) : filteredReviews.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#757575]">
              {reviews.length === 0
                ? 'Chưa có đánh giá nào cho sản phẩm này.'
                : 'Không có đánh giá phù hợp bộ lọc.'}
            </p>
          ) : (
            <div>
              {filteredReviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  isMine={Boolean(myEmail) && review.userEmail.trim().toLowerCase() === myEmail}
                  onEdit={() => setEditing(true)}
                  onDelete={() => setDeleteTarget(review)}
                  deleting={deleteMutation.isPending && deleteTarget?.id === review.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa đánh giá?"
        description="Đánh giá sẽ bị xóa và không thể khôi phục."
        confirmLabel="Xóa"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </section>
  )
}
