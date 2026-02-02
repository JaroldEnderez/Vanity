import DashboardLayout from "./dashboard/layout";
import OrderPage from "@/src/components/orders/OrderPage";
import { getAllServices } from "@/src/app/lib/services";

export default async function Home() {
  const services = await getAllServices();

  return (
    <DashboardLayout>
      <OrderPage services={services} />
    </DashboardLayout>
  );
}
