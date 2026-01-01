// components/layout/DashboardLayout.tsx

import { Header, Sidebar } from "@/src/components/layout"

type Props = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar/>
      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <Header/>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
