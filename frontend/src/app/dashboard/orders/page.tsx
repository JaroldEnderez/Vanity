import OrderPage from "@/src/components/orders/OrderPage";
import { getAllServices } from "@/src/app/lib/services";

export default async function OrdersPage() {
  const services = await getAllServices();

  return <OrderPage services={services} />;
}
