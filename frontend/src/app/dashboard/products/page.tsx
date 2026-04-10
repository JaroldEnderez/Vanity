import { getServicesForBranch } from "@/src/app/lib/services";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import ServicesManager from "@/src/components/services/ServicesManager";

export default async function ProductsPage() {
  const branchId = await getAuthBranchId();
  const services = await getServicesForBranch(branchId);

  return <ServicesManager initialServices={services} />;
}
