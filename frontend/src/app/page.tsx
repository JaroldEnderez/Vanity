import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard - auth middleware will handle login redirect
  redirect("/dashboard/orders");
}
