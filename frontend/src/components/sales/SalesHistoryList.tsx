"use client";

import { useState } from "react";
import { CheckCircle, ChevronDown, ChevronRight } from "lucide-react";

type SaleService = {
  id: string;
  qty: number;
  price: number;
  service: {
    id: string;
    name: string;
  };
};

type Sale = {
  id: string;
  name?: string | null;
  total: number;
  basePrice: number;
  addOns: number;
  createdAt: Date;
  endedAt: Date | null;
  staff: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  } | null;
  saleServices: SaleService[];
};

type Props = {
  sales: Sale[];
  emptyMessage?: string;
};

function formatCompletedDate(dateStr: Date | null) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  if (isToday) return `Today at ${timeStr}`;
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
  
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${timeStr}`;
}

function formatStartedDate(dateStr: Date) {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  if (isToday) return `Today at ${timeStr}`;
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
  
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ` at ${timeStr}`;
}

function SaleHistoryItem({ sale, index }: { sale: Sale; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayName = sale.name || `Session #${index + 1}`;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      {/* Main row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 transition"
      >
        {/* Status indicator - green for completed */}
        <div className="w-3 h-3 rounded-full flex-shrink-0 bg-green-500" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">{displayName}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-700">
              <CheckCircle size={12} />
              Completed
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="font-mono text-xs text-slate-400">#{sale.id.slice(0, 8)}</span>
            <span>•</span>
            <span>{sale.saleServices.length} service{sale.saleServices.length !== 1 ? "s" : ""}</span>
            {sale.staff && (
              <>
                <span>•</span>
                <span>{sale.staff.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Total and dates on the right */}
        <div className="text-right flex-shrink-0">
          <div className="font-semibold text-slate-900">₱{sale.total.toFixed(2)}</div>
          <div className="text-xs text-slate-500">
            <span className="text-slate-400">Started:</span> {formatStartedDate(sale.createdAt)}
          </div>
          <div className="text-xs text-slate-500">
            <span className="text-slate-400">Completed:</span> {formatCompletedDate(sale.endedAt)}
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown size={20} className="text-slate-400" />
          ) : (
            <ChevronRight size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 space-y-4">
          {/* Meta Info */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-slate-500">Staff:</span>{" "}
              <span className="font-medium">{sale.staff?.name || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">Branch:</span>{" "}
              <span className="font-medium">{sale.branch?.name || "—"}</span>
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Services</div>
            {sale.saleServices.map((ss) => (
              <div
                key={ss.id}
                className="flex justify-between items-center bg-white rounded px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{ss.service.name}</span>
                  {ss.qty > 1 && (
                    <span className="text-slate-500 ml-2">×{ss.qty}</span>
                  )}
                </div>
                <div className="text-slate-700">₱{(ss.price * ss.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>₱{sale.basePrice.toFixed(2)}</span>
            </div>
            {sale.addOns > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Add-ons</span>
                <span>₱{sale.addOns.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total</span>
              <span>₱{sale.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesHistoryList({ sales, emptyMessage = "No sales found" }: Props) {
  // Calculate total
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <div className="text-slate-400 mb-2">
          <CheckCircle size={48} className="mx-auto opacity-50" />
        </div>
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-green-100 text-sm">Total Revenue</div>
            <div className="text-3xl font-bold">₱{totalRevenue.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-green-100 text-sm">Completed Sales</div>
            <div className="text-3xl font-bold">{sales.length}</div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {sales.map((sale, index) => (
          <SaleHistoryItem key={sale.id} sale={sale} index={index} />
        ))}
      </div>
    </div>
  );
}
