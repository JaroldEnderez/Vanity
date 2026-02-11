import { getAllMaterials } from "@/src/app/lib/materials";
import MaterialsManager from "@/src/components/inventory/MaterialsManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const materials = await getAllMaterials();

  return <MaterialsManager initialMaterials={materials} />;
}
