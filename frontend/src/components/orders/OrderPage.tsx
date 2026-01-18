"use client";

import { Service } from "@/src/app/types/service";
import ServiceGrid from "./services/ServiceGrid";

type Props = {
  services: Service[];
};

export default function OrderPage({ services }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Order</h1>
      <ServiceGrid services={services} onSelectService={() => {}} />
    </div>
  );
}
