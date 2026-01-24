import { getWeeklySales } from "@/src/app/lib/sales";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";

export default async function WeeklySalesPage() {
  const sales = await getWeeklySales();

  // Get week range for display
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const weekRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}, ${today.getFullYear()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Weekly Sales</h1>
        <p className="text-slate-500">{weekRange}</p>
      </div>

      <SalesHistoryList sales={sales} emptyMessage="No sales completed this week" />
    </div>
  );
}
