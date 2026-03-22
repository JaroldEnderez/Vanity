"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type SalesData = {
  period: string;
  date: Date | string;
  total: number;
  count: number;
};

type Props = {
  data: SalesData[];
  interval: "hour" | "day" | "week" | "month";
  title?: string;
};

export default function SalesChart({ data, interval, title }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">No sales data available for this period</p>
      </div>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);
  const chartData = data;

  const ChartComponent = interval === "hour" ? BarChart : LineChart;
  const DataComponent = interval === "hour" ? Bar : Line;
  const compactX = interval !== "hour";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-4">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        <p className="mt-1 text-sm text-slate-500">
          Total <span className="font-medium text-slate-700">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ChartComponent data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: compactX ? 48 : 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            stroke="#64748b"
            fontSize={12}
            label={{ value: "Time", position: "insideBottom", offset: compactX ? -36 : 0, fill: "#64748b", fontSize: 12 }}
            angle={compactX ? -35 : 0}
            textAnchor={compactX ? "end" : "middle"}
            height={compactX ? 72 : 36}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => `₱${Number(value).toLocaleString()}`}
            label={{ value: "Sales", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            formatter={(value) => [`₱${Number(value ?? 0).toFixed(2)}`, "Sales"]}
            labelFormatter={(label) => String(label)}
          />
          <DataComponent
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            fill="#10b981"
            name="Sales"
            strokeWidth={2}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
