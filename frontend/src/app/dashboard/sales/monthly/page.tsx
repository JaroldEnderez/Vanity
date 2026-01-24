import { getMonthlySales } from "@/src/app/lib/sales";
import SalesHistoryList from "@/src/components/sales/SalesHistoryList";

export default async function MonthlySalesPage() {
  const sales = await getMonthlySales();

  const today = new Date();
  const monthYear = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monthly Sales</h1>
        <p className="text-slate-500">{monthYear}</p>
      </div>

      <SalesHistoryList sales={sales} emptyMessage="No sales completed this month" />
    </div>
  );
}
