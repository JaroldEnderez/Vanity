"use client";

import { useState, useEffect, useCallback } from "react";
import SalesChartLoader from "@/src/components/charts/SalesChartLoader";
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

export default function ReportsPage() {
  const [interval, setInterval] = useState<Interval>("daily");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: new Date(), end: new Date() });

  const loadSales = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      // Ensure dates are properly formatted
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      
      const res = await fetch(
        `/api/sales?startDate=${startISO}&endDate=${endISO}`
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

  // Calculate date ranges based on interval
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
        start.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
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

  const getIntervalLabel = () => {
    switch (interval) {
      case "daily":
        return "Today";
      case "weekly":
        const weekStart = dateRange.start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const weekEnd = dateRange.end.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return `${weekStart} - ${weekEnd}, ${dateRange.end.getFullYear()}`;
      case "monthly":
        return dateRange.start.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
    }
  };

  const getChartInterval = (): "hour" | "day" => {
    return interval === "daily" ? "hour" : "day";
  };

  const getChartTitle = () => {
    switch (interval) {
      case "daily":
        return "Today's Sales by Hour";
      case "weekly":
        return "This Week's Sales by Day";
      case "monthly":
        return "This Month's Sales by Day";
    }
  };

  const getEmptyMessage = () => {
    switch (interval) {
      case "daily":
        return "No sales completed today";
      case "weekly":
        return "No sales completed this week";
      case "monthly":
        return "No sales completed this month";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Interval Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales Reports</h1>
          <p className="text-slate-500 mt-1">{getIntervalLabel()}</p>
        </div>

        {/* Interval Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setInterval("daily")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              interval === "daily"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setInterval("weekly")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              interval === "weekly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              interval === "monthly"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart */}
      <SalesChartLoader
        interval={getChartInterval()}
        startDate={dateRange.start}
        endDate={dateRange.end}
        title={getChartTitle()}
      />

      {/* Sales List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-4 text-slate-500">Loading sales...</p>
        </div>
      ) : (
        <SalesHistoryList sales={sales} emptyMessage={getEmptyMessage()} />
      )}
    </div>
  );
}
