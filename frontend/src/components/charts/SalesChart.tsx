"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, ShoppingCart } from "lucide-react";

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

  // Calculate totals
  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);
  const totalSales = data.reduce((sum, d) => sum + d.count, 0);
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Chart data is already formatted with ISO strings from the API
  const chartData = data;

  // Use Bar chart for hourly, Line chart for others
  const ChartComponent = interval === "hour" ? BarChart : LineChart;
  const DataComponent = interval === "hour" ? Bar : Line;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        {title && <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>}
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={18} className="text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-900">₱{totalRevenue.toFixed(2)}</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart size={18} className="text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Total Sales</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{totalSales}</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={18} className="text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Average Sale</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">₱{averageSale.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="period" 
            stroke="#64748b"
            fontSize={12}
            angle={interval === "hour" ? 0 : -45}
            textAnchor={interval === "hour" ? "middle" : "end"}
            height={interval === "hour" ? 30 : 80}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickFormatter={(value) => `₱${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            formatter={(value, name) => {
              if (name === "total") {
                return [`₱${Number(value ?? 0).toFixed(2)}`, "Revenue"];
              }
              return [value ?? 0, "Sales Count"];
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="total"
            stroke="#10b981"
            fill="#10b981"
            name="Revenue"
            strokeWidth={2}
          />
          <DataComponent
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            fill="#3b82f6"
            name="Sales Count"
            strokeWidth={2}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
