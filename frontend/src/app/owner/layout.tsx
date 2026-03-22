"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Building2, LogOut } from "lucide-react";

const nav = [
  { label: "Overview", href: "/owner", icon: LayoutDashboard },
  { label: "Branches", href: "/owner/branches", icon: Building2 },
];

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link
                href="/owner"
                className="font-bold text-slate-900 text-lg"
              >
                Vanity Dashboard
              </Link>
              <nav className="flex gap-1">
                {nav.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || (href !== "/owner" && pathname?.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        active
                          ? "bg-emerald-100 text-emerald-800"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sign out?</h3>
            <p className="text-sm text-slate-600 mb-6">You will need to sign in again to access the owner dashboard.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
