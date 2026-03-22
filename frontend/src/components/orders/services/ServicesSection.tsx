"use client";

import { Service, ServiceCategory, SERVICE_CATEGORIES } from "@/src/app/types/service";
import ServiceGrid from "./ServiceGrid";
import HairColoringModal from "./HairColoringModal";
import { useSaleStore, DraftMaterial, ColoringDetails } from "@/src/app/store/saleStore";
import { useState, useCallback, useMemo } from "react";

type Props = {
  services: Service[];
  staffId: string;
};

// Cache so we reuse materials on click after prefetch (instant when hovered first)
const materialsCache = new Map<string, Promise<DraftMaterial[]>>();

async function fetchServiceMaterials(serviceId: string): Promise<DraftMaterial[]> {
  const cached = materialsCache.get(serviceId);
  if (cached) return cached;
  const promise = (async () => {
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
  })();
  materialsCache.set(serviceId, promise);
  return promise;
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  Haircut: "Haircut",
  Hair_Coloring: "Hair Coloring",
  Treatment: "Treatment",
  Rebond: "Rebond",
  Perm: "Perm",
  Styling: "Styling",
  Nails: "Nails",
  Others: "Others",
};

function groupByCategory(services: Service[]): Map<ServiceCategory, Service[]> {
  const order = [...SERVICE_CATEGORIES];
  const map = new Map<ServiceCategory, Service[]>();
  for (const s of services) {
    const cat = (s.category || "Others") as ServiceCategory;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  // Sort categories by defined order
  const sorted = new Map<ServiceCategory, Service[]>();
  for (const cat of order) {
    if (map.has(cat)) sorted.set(cat, map.get(cat)!);
  }
  return sorted;
}

export default function ServicesSection({ services, staffId }: Props) {
  const getActiveDraft = useSaleStore((state) => state.getActiveDraft);
  const createDraft = useSaleStore((state) => state.createDraft);
  const addItemToDraft = useSaleStore((state) => state.addItemToDraft);
  const isLoading = useSaleStore((state) => state.isLoading);

  const [isCreating, setIsCreating] = useState(false);
  const [hairColoringService, setHairColoringService] = useState<Service | null>(null);

  const grouped = useMemo(() => groupByCategory(services), [services]);

  const prefetchMaterials = useCallback((serviceId: string) => {
    fetchServiceMaterials(serviceId);
  }, []);

  const addItem = useCallback(
    async (service: Service, materials: DraftMaterial[], coloringDetails?: ColoringDetails) => {
      const activeDraft = getActiveDraft();
      const displayName = coloringDetails?.serviceDisplayName || service.name;

      if (!activeDraft) {
        setIsCreating(true);
        try {
          const newDraft = await createDraft(staffId);
          if (newDraft) {
            addItemToDraft(newDraft.id, {
              serviceId: service.id,
              name: displayName,
              price: service.price,
              qty: 1,
              durationMin: service.durationMin ?? undefined,
              materials,
              coloringDetails,
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

      addItemToDraft(activeDraft.id, {
        serviceId: service.id,
        name: displayName,
        price: service.price,
        qty: 1,
        durationMin: service.durationMin ?? undefined,
        materials,
        coloringDetails,
      });
    },
    [getActiveDraft, createDraft, addItemToDraft, staffId]
  );

  const handleSelectService = async (service: Service) => {
    const materials = await fetchServiceMaterials(service.id);
    const category = (service.category || "Others") as ServiceCategory;

    if (category === "Hair_Coloring") {
      setHairColoringService(service);
      return;
    }

    await addItem(service, materials);
  };

  const handleHairColoringConfirm = async (details: ColoringDetails) => {
    if (!hairColoringService) return;
    const materials = await fetchServiceMaterials(hairColoringService.id);
    await addItem(hairColoringService, materials, details);
    setHairColoringService(null);
  };

  return (
    <div className="h-full">
      <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Services</h2>

      <div className="space-y-10">
        {Array.from(grouped.entries()).map(([category, categoryServices]) => (
          <div key={category} className="pt-2 first:pt-0">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              {CATEGORY_LABELS[category]}
            </h3>
            <ServiceGrid
              services={categoryServices}
              onSelectService={handleSelectService}
              onHoverService={prefetchMaterials}
              selectedServiceId={hairColoringService?.id}
            />
          </div>
        ))}
      </div>

      {hairColoringService && (
        <HairColoringModal
          service={hairColoringService}
          onConfirm={handleHairColoringConfirm}
          onCancel={() => setHairColoringService(null)}
        />
      )}

      {(isCreating || isLoading) && (
        <div className="mt-3 text-sm text-slate-500">
          {isCreating ? "Creating draft…" : "Saving…"}
        </div>
      )}
    </div>
  );
}
