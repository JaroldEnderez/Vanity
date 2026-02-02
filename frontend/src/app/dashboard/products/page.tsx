import { getAllServices } from "@/src/app/lib/services";
import { getAllMaterials } from "@/src/app/lib/materials";
import ServicesManager from "@/src/components/services/ServicesManager";

export default async function ProductsPage() {
  const [services, materials] = await Promise.all([
    getAllServices(),
    getAllMaterials(),
  ]);

  return (
    <ServicesManager 
      initialServices={services} 
      initialMaterials={materials}
    />
  );
}
