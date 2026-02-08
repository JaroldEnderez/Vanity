"use client";

import { useState } from "react";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { 
  ShoppingCart, 
  Scissors, 
  Package,
  BarChart, 
  Settings, 
  History,
  LogOut,
  Building2
} from "lucide-react"

const navItems = [
  { label: "Sessions", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Services", href: "/dashboard/products", icon: Scissors },
  { label: "Inventory", href: "/dashboard/inventory", icon: Package },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart },
  { label: "Sales History", href: "/dashboard/sales", icon: History },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

type Props = {
  onClose?: () => void;
};

export default function Sidebar({ onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const handleLogoutClick = () => setShowLogoutConfirm(true);

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    signOut({ callbackUrl: "/login" });
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile/tablet when link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-56 md:w-64 bg-white border-r flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 md:h-16 flex items-center px-4 md:px-6 font-bold text-lg md:text-xl text-black">
        Vanity POS
      </div>

      {/* Branch Info */}
      {session?.user?.branchName && (
        <div className="mx-2 md:mx-3 mb-3 md:mb-4 px-3 md:px-4 py-2 md:py-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700">
            <Building2 size={14} className="md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium truncate">{session.user.branchName}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 md:px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={href}
              onClick={handleLinkClick}
              className={`flex items-center gap-3 rounded-lg px-3 md:px-4 py-2 md:py-3 transition ${
                active 
                  ? "bg-gray-200 text-gray-900 font-medium" 
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} className="md:w-5 md:h-5" />
              <span className="text-sm md:text-base">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        {showLogoutConfirm ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700 px-1">Are you sure you want to sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition"
              >
                Yes, sign out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-2 md:gap-3 rounded-lg px-3 md:px-4 py-2 md:py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 transition text-sm md:text-base"
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
            <span>Sign out</span>
          </button>
        )}
        <div className="mt-2 px-4 text-xs text-gray-400">
          v1.0.0
        </div>
      </div>
    </aside>
  )
}
