import { getTodaysSales } from "@/src/app/lib/sales";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";

export default async function DailySalesPage() {
  const sales = await getTodaysSales();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Daily Sales</h1>
        <p className="text-slate-500">{today}</p>
      </div>

      <SalesHistoryList sales={sales} emptyMessage="No sales completed today" />
    </div>
  );
}
