"use client";

import { Service } from "@/src/app/types/service";
import ServiceGrid from "./ServiceGrid";
import { useSaleStore, DraftMaterial } from "@/src/app/store/saleStore";
import { useState } from "react";

type Props = {
  services: Service[];
  staffId: string;
};

// Fetch suggested materials for a service
async function fetchServiceMaterials(serviceId: string): Promise<DraftMaterial[]> {
  try {
    const res = await fetch(`/api/services/${serviceId}/materials`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((sm: { materialId: string; quantity: number; material: { name: string; unit: string } }) => ({
      materialId: sm.materialId,
      name: sm.material.name,
      unit: sm.material.unit,
      quantity: sm.quantity,
    }));
  } catch {
    return [];
  }
}

export default function ServicesSection({ services, staffId }: Props) {
  const getActiveDraft = useSaleStore((state) => state.getActiveDraft);
  const createDraft = useSaleStore((state) => state.createDraft);
  const addItemToDraft = useSaleStore((state) => state.addItemToDraft);
  const isLoading = useSaleStore((state) => state.isLoading);

  const [isCreating, setIsCreating] = useState(false);

  const handleSelectService = async (service: Service) => {
    const activeDraft = getActiveDraft();

    // Fetch materials for this service
    const materials = await fetchServiceMaterials(service.id);
    
    // CASE 1: No active draft → create one then add item
    if (!activeDraft) {
      setIsCreating(true);

      try {
        const newDraft = await createDraft(staffId);
        
        if (newDraft) {
          // Add the service to the newly created draft (optimistic, no await)
          addItemToDraft(newDraft.id, {
            serviceId: service.id,
            name: service.name,
            price: service.price,
            qty: 1,
            durationMin: service.durationMin ?? undefined,
            materials,
          });
        }
      } catch (err) {
        console.error(err);
        alert("Failed to create draft sale");
      } finally {
        setIsCreating(false);
      }

      return;
    }

    // CASE 2: Active draft exists → append service (optimistic, no await)
    addItemToDraft(activeDraft.id, {
      serviceId: service.id,
      name: service.name,
      price: service.price,
      qty: 1,
      durationMin: service.durationMin ?? undefined,
      materials,
    });
  };

  return (
    <div className="h-full">
      <h2 className="mb-4 text-xl font-semibold">Services</h2>

      <ServiceGrid
        services={services}
        onSelectService={handleSelectService}
      />

      {(isCreating || isLoading) && (
        <div className="mt-3 text-sm text-slate-500">
          {isCreating ? "Creating draft…" : "Saving…"}
        </div>
      )}
    </div>
  );
}
