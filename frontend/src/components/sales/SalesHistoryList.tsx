"use client";

import { useState } from "react";
import { CheckCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";

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

function SaleHistoryItem({ sale }: { sale: Sale }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedTime = sale.endedAt
    ? new Date(sale.endedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  const startedTime = new Date(sale.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={18} />
          </div>
          
          <div className="text-left">
            <div className="font-medium text-slate-900">
              ₱{sale.total.toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">
              {sale.saleServices.length} service{sale.saleServices.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-700">{completedTime}</div>
            <div className="text-xs text-slate-400">Completed</div>
          </div>
          
          {isExpanded ? (
            <ChevronDown size={18} className="text-slate-400" />
          ) : (
            <ChevronRight size={18} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
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
            <div className="flex items-center gap-1 text-slate-500">
              <Clock size={14} />
              <span>Started {startedTime}</span>
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

          {/* Sale ID */}
          <div className="text-xs text-slate-400 font-mono">
            ID: {sale.id}
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
      <div className="space-y-2">
        {sales.map((sale) => (
          <SaleHistoryItem key={sale.id} sale={sale} />
        ))}
      </div>
    </div>
  );
}
