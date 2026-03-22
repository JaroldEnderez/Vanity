"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SalesChartLoader from "@/src/components/charts/SalesChartLoader";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

type QuickFilter = "last7" | "last30" | "thisMonth";

type Sale = {
  id: string;
  name: string | null;
  total: number;
  basePrice: number;
  addOns: number;
  cashReceived?: number | null;
  changeGiven?: number | null;
  createdAt: Date;
  endedAt: Date | null;
  status: string;
  customer: { id: string; name: string } | null;
  staff: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  saleServices: Array<{
    id: string;
    qty: number;
    price: number;
    serviceDisplayName?: string | null;
    colorUsed?: string | null;
    developer?: string | null;
    service: { id: string; name: string };
  }>;
};

function getDateRangeForQuickFilter(filter: QuickFilter): { start: Date; end: Date } {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "last7":
      start.setDate(start.getDate() - 6);
      break;
    case "last30":
      start.setDate(start.getDate() - 29);
      break;
    case "thisMonth":
      start.setDate(1);
      break;
  }

  return { start, end };
}

function formatMMDDYY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export default function SalesHistoryPage() {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("last7");
  const [chartOpen, setChartOpen] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => getDateRangeForQuickFilter(quickFilter), [quickFilter]);

  const loadSales = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sales?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch sales");
      const data = await res.json();
      setSales(data);
    } catch (error) {
      console.error("Failed to load sales:", error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales(dateRange.start, dateRange.end);
  }, [dateRange, loadSales]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales History</h1>
        <p className="text-slate-500 mt-1">
          Sales from {formatMMDDYY(dateRange.start)} to {formatMMDDYY(dateRange.end)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {(
          [
            { id: "last7" as const, label: "Last 7 days" },
            { id: "last30" as const, label: "Last 30 days" },
            { id: "thisMonth" as const, label: "This month" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setQuickFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              quickFilter === id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setChartOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
          aria-expanded={chartOpen}
        >
          <span className="text-base font-semibold text-slate-900">Sales chart</span>
          {chartOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" aria-hidden />
          )}
        </button>
        {chartOpen && (
          <div className="px-4 pb-4 border-t border-slate-100">
            <SalesChartLoader
              interval="day"
              startDate={dateRange.start}
              endDate={dateRange.end}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Transactions</h2>
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="mt-4 text-slate-500">Loading sales...</p>
          </div>
        ) : (
          <SalesHistoryList sales={sales} emptyMessage="No sales in this period" />
        )}
      </section>
    </div>
  );
}
