// components/layout/TopBar.tsx
export default function Header() {
    return (
      <header className="h-16 bg-white border-b flex items-center justify-between px-6">
        {/* Left */}
        <div className="text-black">
          <h1 className="text-lg font-semibold">Orders</h1>
          <p className="text-sm text-gray-500">
            Create sales quickly and easily
          </p>
        </div>
  
        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Branch */}
          <div className="text-sm">
            <div className="text-gray-500">Branch</div>
            <div className="font-medium">Main Branch</div>
          </div>
  
          {/* Staff */}
          <div className="text-sm">
            <div className="text-gray-500">Staff</div>
            <div className="font-medium">Ana Cashier</div>
          </div>
        </div>
      </header>
    )
  }
  