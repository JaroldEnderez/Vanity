import DashboardLayout from "./dashboard/layout";
import SaleTab from "@/src/components/orders/sale/SaleTab";
import { getServices } from "@/src/app/lib/services";

export default async function Home() {
  const services = await getServices();
  const branchId = "da6479ee-99e4-495e-bf62-0ab4dc6d4dea";
  const staffId = "staff-001";

  return (
    <div> 
      <DashboardLayout>
        <SaleTab 
          services={services}
          branchId={branchId}
          staffId={staffId}
        />
      </DashboardLayout>
    </div>
    
  );
}
