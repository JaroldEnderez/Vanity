import { getServicesForBranch } from "@/src/app/lib/services";
import { getAllMaterials } from "@/src/app/lib/materials";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import ServicesManager from "@/src/components/services/ServicesManager";

export default async function ProductsPage() {
  const branchId = await getAuthBranchId();
  const [services, materials] = await Promise.all([
    getServicesForBranch(branchId),
    getAllMaterials(),
  ]);

  return (
    <ServicesManager
      initialServices={services}
      initialMaterials={materials}
    />
  );
}
