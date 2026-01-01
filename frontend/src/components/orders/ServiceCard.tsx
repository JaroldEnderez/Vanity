"use client";

import { Service } from "@/types/service";

type Props = {
  service: Service;
  onSelect?: (service: Service) => void;
};

export default function ServiceCard({ service, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect?.(service)}
      className="flex flex-col justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
    >
      <div>
        <h3 className="font-medium text-slate-900">{service.name}</h3>

        {service.durationMinutes && (
          <p className="mt-1 text-xs text-slate-500">
            {service.durationMinutes} mins
          </p>
        )}
      </div>

      <div className="mt-4 text-lg font-semibold text-slate-800">
        ₱{service.price.toFixed(2)}
      </div>
    </button>
  );
}
