"use client";

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
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
