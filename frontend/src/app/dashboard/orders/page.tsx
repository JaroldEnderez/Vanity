import OrderPage from "@/components/order/OrderPage";
import { getServices } from "@/lib/services";

export default async function OrdersPage() {
  const branchId = "branch-001";
  const services = await getServices(branchId);

  return <OrderPage services={services} />;
}
