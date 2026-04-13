import { getWeeklySales } from "@/src/app/lib/sales";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";
import SalesExportButton from "@/src/components/sales/SalesExportButton";

export default async function WeeklySalesPage() {
  const sales = await getWeeklySales();

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeekDisplay = new Date(startOfWeek);
  endOfWeekDisplay.setDate(startOfWeek.getDate() + 6);

  const endOfWeekExport = new Date(startOfWeek);
  endOfWeekExport.setDate(startOfWeek.getDate() + 7);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const weekRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeekDisplay)}, ${today.getFullYear()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Sales</h1>
          <p className="text-slate-500">{weekRange}</p>
        </div>
        <SalesExportButton
          startDate={startOfWeek.toISOString()}
          endDate={endOfWeekExport.toISOString()}
          label="Export week to Excel"
        />
      </div>

      <SalesHistoryList sales={sales} emptyMessage="No sales completed this week" />
    </div>
  );
}
