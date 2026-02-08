"use client";

import { Service } from "@/src/app/types/service";
import ServiceCard from "./ServiceCard";

type Props = {
  services: Service[];
  onSelectService: (service: Service) => void;
};

export default function ServiceGrid({
  services,
  onSelectService,
}: Props) {
  if (!services.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
        No services available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onSelect={onSelectService}
        />
      ))}
    </div>
  );
}

