"use client";

import { Service } from "@/src/app/types/service";
import { useSaleStore } from "@/src/app/store/saleStore";

type Props = {
  service: Service;
  onSelect?: (service: Service) => void;
};

export default function ServiceCard({ service, onSelect }: Props) {
  const getActiveDraft = useSaleStore((state) => state.getActiveDraft);
  const activeDraft = getActiveDraft();
  return (
    <button
      disabled={!activeDraft}
      onClick={() => onSelect?.(service)}
      className={`rounded-lg p-4 border transition-all duration-200 hover:bg-slate-50 hover:scale-105 hover:shadow-lg active:scale-[0.98]
        ${!activeDraft ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <div>
        <h3 className="font-medium text-slate-900">{service.name}</h3>

        {service.durationMin && (
          <p className="mt-1 text-xs text-slate-500">
            {service.durationMin} mins
          </p>
        )}
      </div>

      <div className="mt-4 text-lg font-semibold text-slate-800">
        ₱{service.price.toFixed(2)}
      </div>
    </button>
  );
}

