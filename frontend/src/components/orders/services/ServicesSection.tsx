"use client";

import { Service } from "@/src/app/types/service";
import ServiceGrid from "./ServiceGrid";
import { useSaleStore } from "@/src/app/store/saleStore";
import { useState } from "react";

type Props = {
  services: Service[];
};

export default function ServicesSection({ services }: Props) {
  const {
    getActiveDraft,
    addDraft,
    addItemToDraft,
  } = useSaleStore();

  const [isCreating, setIsCreating] = useState(false);

  const handleSelectService = async (service: Service) => {
    const activeDraft = getActiveDraft();
    
    // CASE 1: No active draft → create one
    if (!activeDraft) {
      setIsCreating(true);

      try {
        const branchId = "da6479ee-99e4-495e-bf62-0ab4dc6d4dea";
        const staffId = "staff-001";

        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: service.id,
            branchId,
            staffId,
            basePrice: service.price,
            addOns: 0,
            total: service.price,

          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create sale");
        }

        const newSale = await response.json();

        // Add to draft store (temporary)
        addDraft({
          ...newSale,
          status: 'active',
          isPaid: false,
          subtotal: service.price,
          total: service.price,
          items: [
            {
              id: crypto.randomUUID(),
              serviceId: service.id,
              name: service.name,
              price: service.price,
              qty: 1,
              durationMin: service.durationMin,
            },
          ],
        });
      } catch (err) {
        console.error(err);
        alert("Failed to create draft sale");
      } finally {
        setIsCreating(false);
      }

      return;
    }

    // CASE 2: Active draft exists → append service
    addItemToDraft(activeDraft.id, {
      id: crypto.randomUUID(),
      serviceId: service.id,
      name: service.name,
      price: service.price,
      qty: 1,
      durationMin: service.durationMin,
    });
  };

  return (
    <div className="h-full">
      <h2 className="mb-4 text-xl font-semibold">Services</h2>

      <ServiceGrid
        services={services}
        onSelectService={handleSelectService}
      />

      {isCreating && (
        <div className="mt-3 text-sm text-slate-500">
          Creating draft…
        </div>
      )}
    </div>
  );
}

