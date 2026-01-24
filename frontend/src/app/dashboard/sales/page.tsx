import { redirect } from "next/navigation";

export default function SalesPage() {
  // Redirect to daily sales by default
  redirect("/dashboard/sales/daily");
}
