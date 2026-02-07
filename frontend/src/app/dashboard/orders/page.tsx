import OrderPage from "@/src/components/orders/OrderPage";
import { getServices } from "@/src/app/lib/services";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import { db } from "@/src/app/lib/db";

export default async function OrdersPage() {
  const branchId = await getAuthBranchId();
  
  // Get services for this branch (or all if no branchId filter on services)
  const services = await getServices(branchId);
  
  // Get first staff from this branch as default
  const staff = await db.staff.findFirst({
    where: { branchId },
  });
  
  const defaultStaffId = staff?.id || "";

  return <OrderPage services={services} defaultStaffId={defaultStaffId} />;
}
