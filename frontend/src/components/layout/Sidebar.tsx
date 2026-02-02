"use client";

import { useState } from "react";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  ShoppingCart, 
  Scissors, 
  Package,
  BarChart, 
  Settings, 
  History,
  ChevronDown,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange
} from "lucide-react"

const navItems = [
  { label: "Sessions", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Services", href: "/dashboard/products", icon: Scissors },
  { label: "Inventory", href: "/dashboard/inventory", icon: Package },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

const salesHistoryItems = [
  { label: "Daily Sales", href: "/dashboard/sales/daily", icon: Calendar },
  { label: "Weekly Sales", href: "/dashboard/sales/weekly", icon: CalendarDays },
  { label: "Monthly Sales", href: "/dashboard/sales/monthly", icon: CalendarRange },
]

export default function Sidebar() {
  const [isSalesHistoryOpen, setIsSalesHistoryOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
  const isSalesHistoryActive = salesHistoryItems.some(item => isActive(item.href));

  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 font-bold text-xl text-black">
        Vanity POS
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                active 
                  ? "bg-gray-200 text-gray-900 font-medium" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Sales History - Collapsible */}
        <div>
          <button
            onClick={() => setIsSalesHistoryOpen(!isSalesHistoryOpen)}
            className={`w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition ${
              isSalesHistoryActive 
                ? "bg-gray-200 text-gray-900 font-medium" 
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <History size={20} />
              <span>Sales History</span>
            </div>
            {isSalesHistoryOpen ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* Sub-items */}
          {isSalesHistoryOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {salesHistoryItems.map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={label}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition ${
                      active 
                        ? "bg-gray-200 text-gray-900 font-medium" 
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 text-sm text-gray-400">
        v1.0.0
      </div>
    </aside>
  )
}
