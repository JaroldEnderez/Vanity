"use client";

import { useSaleStore } from "@/src/app/store/saleStore";

export default function StartSaleButton({
  staffId,
}: {
  staffId: string;
}) {
  const { createDraft } = useSaleStore();

  return (
    <button
      onClick={() => createDraft(staffId)}
      className="w-full rounded-lg bg-emerald-600 py-3 text-white font-semibold transition hover:bg-emerald-700"
    >
      Start Draft
    </button>
  );
}


