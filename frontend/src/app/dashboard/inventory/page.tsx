import { getAllMaterials } from "@/src/app/lib/materials";
import { getAuthBranchId } from "@/src/app/lib/auth-utils";
import MaterialsManager from "@/src/components/inventory/MaterialsManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const branchId = await getAuthBranchId();
  const materials = await getAllMaterials(branchId);

  return <MaterialsManager initialMaterials={materials} canManageCatalog />;
}
