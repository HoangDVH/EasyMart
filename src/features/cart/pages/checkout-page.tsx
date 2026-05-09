import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { useCreateOrderMutation } from "@/features/products/hooks/use-catalog";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { calcCartSubtotal, useCartStore } from "@/shared/stores/cart-store";

function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(n);
}

type CheckoutFormValues = {
  customerName: string;
  phone: string;
  address: string;
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrderMutation();
  const { items, clearCart } = useCartStore();
  const subtotal = calcCartSubtotal(items);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CheckoutFormValues>({
    defaultValues: { customerName: "", phone: "", address: "" },
  });

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chưa có sản phẩm để thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Vui lòng thêm sản phẩm vào giỏ hàng trước khi tạo đơn.
        </CardContent>
        <CardFooter>
          <Link to="/cart">
            <Button>Xem giỏ hàng</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const onSubmit = async () => {
    try {
      await createOrder.mutateAsync({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
      clearCart();
      toast.success("Đặt hàng thành công. Đơn của bạn đang được xử lý.");
      reset();
      navigate("/");
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Không thể thanh toán. Vui lòng thử lại."),
      );
    }
  };

  return (
    <form
      className="grid gap-4 lg:grid-cols-3"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-name">Họ và tên</Label>
              <Input
                id="checkout-name"
                {...register("customerName", {
                  required: "Vui lòng nhập họ và tên.",
                })}
              />
              {errors.customerName ? (
                <p className="text-xs text-destructive">
                  {errors.customerName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-phone">Số điện thoại</Label>
              <Input
                id="checkout-phone"
                {...register("phone", {
                  required: "Vui lòng nhập số điện thoại.",
                })}
              />
              {errors.phone ? (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-address">Địa chỉ nhận hàng</Label>
              <Input
                id="checkout-address"
                {...register("address", {
                  required: "Vui lòng nhập địa chỉ nhận hàng.",
                })}
              />
              {errors.address ? (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tóm tắt đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between gap-2"
            >
              <span className="line-clamp-1">
                {item.name} x{item.quantity}
              </span>
              <span>{formatVnd((item.price ?? 0) * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Tổng thanh toán</span>
              <span className="text-primary">{formatVnd(subtotal)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={createOrder.isPending || isSubmitting}
          >
            {createOrder.isPending || isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Xác nhận thanh toán
          </Button>
          <Link to="/cart" className="w-full">
            <Button variant="outline" className="w-full">
              Quay lại giỏ hàng
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </form>
  );
}
