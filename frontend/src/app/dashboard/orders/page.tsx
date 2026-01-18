import OrderPage from "@/src/components/orders/OrderPage";
import { getServices } from "@/src/app/lib/services";

export default async function OrdersPage() {
  const branchId = "branch-001";
  const services = await getServices(branchId);

  return <OrderPage services={services} />;
}
