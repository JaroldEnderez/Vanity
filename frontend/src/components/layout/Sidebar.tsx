// components/layout/SidebarNav.tsx
import Link from "next/link"
import { ShoppingCart, Box, BarChart, Settings } from "lucide-react"

const navItems = [
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Products", href: "/dashboard/products", icon: Box },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 font-bold text-xl text-black">
        Vanity POS
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition"
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 text-sm text-gray-400">
        v1.0.0
      </div>
    </aside>
  )
}
