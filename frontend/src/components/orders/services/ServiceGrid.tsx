"use client";

import { useMemo } from "react";
import {
  DEFAULT_SERVICE_CATEGORY,
  SERVICE_CATEGORIES,
  Service,
  labelServiceCategory,
} from "@/src/app/types/service";
import ServiceCard from "./ServiceCard";

type Props = {
  services: Service[];
  onSelectService: (service: Service) => void;
  onHoverService?: (serviceId: string) => void;
  selectedServiceId?: string | null;
};

function groupingKey(category: string | undefined | null): string {
  if (!category || category === "default") return DEFAULT_SERVICE_CATEGORY;
  return category;
}

export default function ServiceGrid({
  services,
  onSelectService,
  onHoverService,
  selectedServiceId = null,
}: Props) {
  const sections = useMemo(() => {
    const byCategory = new Map<string, Service[]>();
    for (const s of services) {
      const key = groupingKey(s.category);
      const list = byCategory.get(key);
      if (list) list.push(s);
      else byCategory.set(key, [s]);
    }
    for (const list of byCategory.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const ordered: string[] = [];
    for (const c of SERVICE_CATEGORIES) {
      if (byCategory.get(c)?.length) ordered.push(c);
    }
    const known = new Set(SERVICE_CATEGORIES as readonly string[]);
    const rest = [...byCategory.keys()]
      .filter((k) => !known.has(k))
      .sort((a, b) => labelServiceCategory(a).localeCompare(labelServiceCategory(b)));
    for (const k of rest) {
      if (byCategory.get(k)?.length) ordered.push(k);
    }
    return ordered.map((category) => ({
      category,
      services: byCategory.get(category)!,
    }));
  }, [services]);

  if (!services.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
        No services available
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(({ category, services: list }) => (
        <section key={category} aria-labelledby={`service-cat-${category}`}>
          <h3
            id={`service-cat-${category}`}
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {labelServiceCategory(category)}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {list.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelect={onSelectService}
                onHover={onHoverService ? () => onHoverService(service.id) : undefined}
                isHighlighted={selectedServiceId === service.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

