"use client";

import { Service } from "@/src/app/types/service";
import { useSaleStore } from "@/src/app/store/saleStore";
import { formatPHP } from "@/src/app/lib/money";

type Props = {
  service: Service;
  onSelect?: (service: Service) => void;
  onHover?: () => void;
  isHighlighted?: boolean;
};

export default function ServiceCard({ service, onSelect, onHover, isHighlighted = false }: Props) {
  const draftSales = useSaleStore((state) => state.draftSales);
  const activeDraftId = useSaleStore((state) => state.activeDraftId);
  const activeDraft = activeDraftId
    ? draftSales.find((d) => d.id === activeDraftId) || null
    : null;
  const isDisabled = !activeDraft || activeDraft.isPaid || activeDraft.status === "completed";

  return (
    <button
      disabled={isDisabled}
      onClick={() => onSelect?.(service)}
      onMouseEnter={onHover}
      className={`rounded-lg p-4 border transition-transform duration-150 cursor-pointer
        ${isDisabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-slate-50 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"}
        ${isHighlighted ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50 border-blue-300" : ""}
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
        {formatPHP(service.price)}
      </div>
    </button>
  );
}

