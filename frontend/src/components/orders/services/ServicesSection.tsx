"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { Service, labelServiceCategory } from "@/src/app/types/service";
import ServiceGrid from "./ServiceGrid";
import { useSaleStore, DraftMaterial } from "@/src/app/store/saleStore";
import type { PackageMeasure } from "@prisma/client";
import { Search } from "lucide-react";

type Props = {
  services: Service[];
  staffId: string;
};

type ApiServiceMaterialRow = {
  materialId: string;
  quantity: number;
  material: {
    id: string;
    name: string;
    unit: string;
    packageAmount?: number | null;
    packageMeasure?: PackageMeasure | null;
  };
};

function mapApiToDraftMaterials(rows: ApiServiceMaterialRow[]): DraftMaterial[] {
  return rows.map((sm) => ({
    materialId: sm.materialId,
    name: sm.material.name,
    unit: sm.material.unit,
    quantity: sm.quantity,
    packageAmount: sm.material.packageAmount ?? null,
    packageMeasure: sm.material.packageMeasure ?? null,
  }));
}

export default function ServicesSection({ services, staffId }: Props) {
  const getActiveDraft = useSaleStore((state) => state.getActiveDraft);
  const createDraft = useSaleStore((state) => state.createDraft);
  const addItemToDraft = useSaleStore((state) => state.addItemToDraft);
  const isLoading = useSaleStore((state) => state.isLoading);

  const materialsCache = useRef<Map<string, DraftMaterial[]>>(new Map());

  const [isCreating, setIsCreating] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");

  const orderedServices = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return orderedServices;
    return orderedServices.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (s.description?.toLowerCase().includes(q)) return true;
      if (labelServiceCategory(s.category).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [orderedServices, serviceSearch]);

  const fetchServiceMaterials = useCallback(async (serviceId: string): Promise<DraftMaterial[]> => {
    const cached = materialsCache.current.get(serviceId);
    if (cached) return cached;
    const res = await fetch(`/api/services/${serviceId}/materials`);
    if (!res.ok) {
      materialsCache.current.set(serviceId, []);
      return [];
    }
    const data: ApiServiceMaterialRow[] = await res.json();
    const mapped = mapApiToDraftMaterials(data);
    materialsCache.current.set(serviceId, mapped);
    return mapped;
  }, []);

  const prefetchMaterials = useCallback(
    (serviceId: string) => {
      void fetchServiceMaterials(serviceId).catch(() => {});
    },
    [fetchServiceMaterials]
  );

  const addItem = useCallback(
    async (service: Service, materials: DraftMaterial[] = []) => {
      const activeDraft = getActiveDraft();

      if (!activeDraft) {
        setIsCreating(true);
        try {
          const newDraft = await createDraft(staffId);
          if (newDraft) {
            addItemToDraft(newDraft.id, {
              serviceId: service.id,
              serviceCategory: service.category ?? null,
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

      addItemToDraft(activeDraft.id, {
        serviceId: service.id,
        serviceCategory: service.category ?? null,
        name: service.name,
        price: service.price,
        qty: 1,
        durationMin: service.durationMin ?? undefined,
        materials,
      });
    },
    [getActiveDraft, createDraft, addItemToDraft, staffId]
  );

  const handleSelectService = async (service: Service) => {
    const materials = await fetchServiceMaterials(service.id);
    await addItem(service, materials);
  };

  return (
    <div className="h-full">
      <div className="mb-3 md:mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Services</h2>
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            placeholder="Filter services…"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          {serviceSearch.trim()
            ? "No services match your search."
            : "No services available."}
        </div>
      ) : (
        <ServiceGrid
          services={filteredServices}
          onSelectService={handleSelectService}
          onHoverService={prefetchMaterials}
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
