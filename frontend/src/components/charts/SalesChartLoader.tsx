"use client";

import { useState, useEffect } from "react";
import SalesChart from "./SalesChart";

type Interval = "hour" | "day" | "week" | "month";

type Props = {
  interval: Interval;
  startDate?: Date;
  endDate?: Date;
  title?: string;
};

export default function SalesChartLoader({ interval, startDate, endDate, title }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [interval, startDate, endDate]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      let url = `/api/sales/analytics?interval=${interval}`;
      
      if (interval !== "hour" && startDate && endDate) {
        const start = startDate.toISOString().split("T")[0];
        const end = endDate.toISOString().split("T")[0];
        url += `&startDate=${start}&endDate=${end}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error("Failed to load chart data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        <p className="mt-4 text-slate-500">Loading chart...</p>
      </div>
    );
  }

  return <SalesChart data={data} interval={interval} title={title} />;
}
