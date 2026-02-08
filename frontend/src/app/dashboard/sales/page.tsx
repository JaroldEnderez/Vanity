"use client";

import { useState, useEffect, useCallback } from "react";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";
import { Loader2 } from "lucide-react";

type Interval = "daily" | "weekly" | "monthly";
type Sale = {
  id: string;
  name: string | null;
  total: number;
  basePrice: number;
  addOns: number;
  createdAt: Date;
  endedAt: Date | null;
  status: string;
  staff: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  saleServices: Array<{
    id: string;
    qty: number;
    price: number;
    service: { id: string; name: string };
  }>;
};

function toDateInputString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatMMDDYY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export default function SalesHistoryPage() {
  const [interval, setInterval] = useState<Interval>("daily");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });

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
    const today = new Date();
    let start: Date;
    let end: Date = new Date(today);

    switch (interval) {
      case "daily":
        start = new Date(today);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "weekly":
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "monthly":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
    }

    setDateRange({ start, end });
    loadSales(start, end);
  }, [interval, loadSales]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    const start = startOfDay(parseDateInput(value));
    setDateRange((prev) => {
      loadSales(start, endOfDay(prev.end));
      return { ...prev, start };
    });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    const end = endOfDay(parseDateInput(value));
    setDateRange((prev) => {
      loadSales(startOfDay(prev.start), end);
      return { ...prev, end };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales History</h1>
        <p className="text-slate-500 mt-1">
          Sales from {formatMMDDYY(dateRange.start)} to {formatMMDDYY(dateRange.end)}
        </p>
      </div>

      {/* Editable date range + preset toggles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="start-date" className="text-sm font-medium text-slate-700 sr-only">
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            value={toDateInputString(dateRange.start)}
            onChange={handleStartDateChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <span className="text-slate-500 text-sm">to</span>
        <div className="flex items-center gap-2">
          <label htmlFor="end-date" className="text-sm font-medium text-slate-700 sr-only">
            End date
          </label>
          <input
            id="end-date"
            type="date"
            value={toDateInputString(dateRange.end)}
            onChange={handleEndDateChange}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <span className="text-slate-400 text-sm mx-1">|</span>
        <div className="flex gap-2">
          <button
            onClick={() => setInterval("daily")}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
              interval === "daily"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setInterval("weekly")}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
              interval === "weekly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
              interval === "monthly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-4 text-slate-500">Loading sales...</p>
        </div>
      ) : (
        <SalesHistoryList sales={sales} emptyMessage="No sales completed in this period" />
      )}
    </div>
  );
}
