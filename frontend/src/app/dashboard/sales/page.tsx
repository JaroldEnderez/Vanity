"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import SalesChartLoader from "@/src/components/charts/SalesChartLoader";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";
import SalesExportButton from "@/src/components/sales/SalesExportButton";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { formatPHP } from "@/src/app/lib/money";

type QuickFilter = "today" | "last7" | "last30" | "thisYear" | "allTime" | "custom";

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
  optionalMaterials?: unknown;
};

function getDateRangeForQuickFilter(filter: QuickFilter): { start: Date; end: Date } {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      break;
    case "last7":
      start.setDate(start.getDate() - 6);
      break;
    case "last30":
      start.setDate(start.getDate() - 29);
      break;
    case "thisYear":
      start.setMonth(0, 1);
      break;
    case "allTime":
      start.setTime(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "custom":
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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [visibleServiceCount, setVisibleServiceCount] = useState(5);
  const [exportStaffId, setExportStaffId] = useState("");
  const [exportServiceId, setExportServiceId] = useState("");
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [serviceOptions, setServiceOptions] = useState<{ id: string; name: string }[]>([]);

  const dateRange = useMemo(() => {
    if (quickFilter !== "custom") return getDateRangeForQuickFilter(quickFilter);

    const fallback = getDateRangeForQuickFilter("last7");
    if (!customStart || !customEnd) return fallback;

    const start = new Date(`${customStart}T00:00:00`);
    const end = new Date(`${customEnd}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return fallback;
    }

    return { start, end }; 
  }, [quickFilter, customStart, customEnd]);

  const rangeStartMs = dateRange.start.getTime();
  const rangeEndMs = dateRange.end.getTime();

  // Reset "top services" to the default view when the date range changes.
  useEffect(() => {
    setVisibleServiceCount(5);
  }, [rangeStartMs, rangeEndMs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [staffRes, serviceRes] = await Promise.all([
          fetch("/api/staff"),
          fetch("/api/services"),
        ]);
        if (!staffRes.ok || !serviceRes.ok) return;
        const staffJson: unknown = await staffRes.json();
        const serviceJson: unknown = await serviceRes.json();
        if (cancelled) return;
        if (Array.isArray(staffJson)) {
          setStaffOptions(
            staffJson
              .filter(
                (s): s is { id: string; name: string } =>
                  typeof s === "object" &&
                  s !== null &&
                  "id" in s &&
                  "name" in s &&
                  typeof (s as { id: unknown }).id === "string" &&
                  typeof (s as { name: unknown }).name === "string"
              )
              .map((s) => ({ id: s.id, name: s.name }))
          );
        }
        if (Array.isArray(serviceJson)) {
          setServiceOptions(
            serviceJson
              .filter(
                (s): s is { id: string; name: string } =>
                  typeof s === "object" &&
                  s !== null &&
                  "id" in s &&
                  "name" in s &&
                  typeof (s as { id: unknown }).id === "string" &&
                  typeof (s as { name: unknown }).name === "string"
              )
              .map((s) => ({ id: s.id, name: s.name }))
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  // type ServicePerformance = {
  //   serviceId: string;
  //   serviceName: string;
  //   revenue: number;
  //   qty: number;
  // };

  // const topServices = useMemo(() => {
  //   const byServiceId = new Map<string, ServicePerformance>();

  //   for (const sale of sales) {
  //     for (const ss of sale.saleServices) {
  //       const serviceId = ss.service.id;
  //       const existing = byServiceId.get(serviceId);
  //       const lineRevenue = ss.qty * ss.price;

  //       if (existing) {
  //         existing.revenue += lineRevenue;
  //         existing.qty += ss.qty;
  //       } else {
  //         byServiceId.set(serviceId, {
  //           serviceId,
  //           serviceName: ss.service.name,
  //           revenue: lineRevenue,
  //           qty: ss.qty,
  //         });
  //       }
  //     }
  //   }

  //   return Array.from(byServiceId.values())
  //     .filter((s) => s.revenue > 0)
  //     .sort((a, b) => {
  //       // Primary: revenue, then quantity, then name for stable ordering.
  //       if (b.revenue !== a.revenue) return b.revenue - a.revenue;
  //       if (b.qty !== a.qty) return b.qty - a.qty;
  //       return a.serviceName.localeCompare(b.serviceName);
  //     });
  // }, [sales]);

  // const nonZeroServiceCount = topServices.length;
  // const effectiveVisibleServiceCount = Math.min(visibleServiceCount, nonZeroServiceCount);
  // const visibleServices = topServices.slice(0, effectiveVisibleServiceCount);

  // const serviceShowMoreOptions = useMemo(() => {
  //   if (nonZeroServiceCount === 0) return [];

  //   const options = new Set<number>();
  //   for (let i = 5; i < nonZeroServiceCount; i += 5) options.add(i);
  //   options.add(nonZeroServiceCount); // "last non-zero performed service"

  //   return Array.from(options).sort((a, b) => a - b);
  // }, [nonZeroServiceCount]);

  type ServicePerformance = {
    serviceId: string;
    serviceName: string;
    qty: number;
    revenue: number;
  }

  const topServices = useMemo(() => {
    const byServiceId = new Map<string, ServicePerformance>();

    for (const sale of sales){
      for (const ss of sale.saleServices){
        const serviceId = ss.service.id
        const existing = byServiceId.get(serviceId)
        const lineRevenue = ss.qty * ss.price

        if(existing){
          existing.revenue += lineRevenue
          existing.qty += ss.qty
        } else {
          byServiceId.set(serviceId, {
            serviceId,
            serviceName: ss.service.name,
            revenue: lineRevenue,
            qty: ss.qty
          })
        }
      }
    }

    return Array.from(byServiceId.values())
      .filter((s)=> s.revenue > 0)
      .sort((a,b) => {
          if (a.revenue !== b.revenue) return b.revenue - a.revenue
          if (a.qty !== b.qty) return b.qty - a.qty
          return a.serviceName.localeCompare(b.serviceName)
        })
  }, [sales])

  const nonZeroServiceCount = topServices.length
  const effectiveVisibleServiceCount = Math.min(nonZeroServiceCount, visibleServiceCount)
  const visibleServices = topServices.slice(0, effectiveVisibleServiceCount)

  const serviceShowMoreOptions = useMemo(() => {
    if (nonZeroServiceCount === 0) return []

    const options = new Set<number>()
    for (let i = 5; i < nonZeroServiceCount; i += 5){
      options.add(i)
    }
    options.add(nonZeroServiceCount)

    return Array.from(options).sort((a,b) => a - b)
  }, [nonZeroServiceCount])

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
            { id: "today" as const, label: "Today" },
            { id: "last7" as const, label: "Last 7 days" },
            { id: "last30" as const, label: "Last 30 days" },
            { id: "thisYear" as const, label: "This Year" },
            { id: "allTime" as const, label: "All Time" },
            { id: "custom" as const, label: "Custom Range" },
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
      {quickFilter === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            <span className="block mb-1">Start</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            <span className="block mb-1">End</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          <span className="block mb-1">Staff (export)</span>
          <select
            value={exportStaffId}
            onChange={(e) => setExportStaffId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white min-w-[10rem]"
          >
            <option value="">All staff</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-600">
          <span className="block mb-1">Service (export)</span>
          <select
            value={exportServiceId}
            onChange={(e) => setExportServiceId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white min-w-[10rem]"
          >
            <option value="">All services</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <SalesExportButton
          startDate={dateRange.start}
          endDate={dateRange.end}
          staffId={exportStaffId || undefined}
          serviceId={exportServiceId || undefined}
        />
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top performing services</h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on total revenue (qty × price) in this period
            </p>
          </div>

          {nonZeroServiceCount > 5 && (
            <div className="flex items-center gap-2">
              <label htmlFor="serviceShowMore" className="text-sm text-slate-600">
                Show more
              </label>
              <select
                id="serviceShowMore"
                value={effectiveVisibleServiceCount}
                onChange={(e) => setVisibleServiceCount(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                {serviceShowMoreOptions.map((count) => (
                  <option key={count} value={count}>
                    {count === nonZeroServiceCount ? `Show all (${count})` : `Show ${count}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {nonZeroServiceCount === 0 ? (
          <div className="text-sm text-slate-500">
            No performed services with revenue in this period.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleServices.map((s) => (
              <div
                key={s.serviceId}
                className="flex items-center justify-between gap-3 rounded px-2 py-2 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{s.serviceName}</div>
                  <div className="text-xs text-slate-500">{s.qty} total qty</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900 tabular-nums">
                    {formatPHP(s.revenue)}
                  </div>
                </div>
              </div>
            ))}
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
