"use client";

import { useToastStore } from "@/src/app/store/toastStore";
import { CheckCircle } from "lucide-react";

export default function Toaster() {
  const { message, visible, hide } = useToastStore();

  if (!visible || !message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg shadow-lg border border-emerald-700"
    >
      <CheckCircle size={20} className="flex-shrink-0" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={hide}
        className="ml-1 p-1 rounded hover:bg-white/20 transition"
        aria-label="Dismiss"
      >
        <span className="sr-only">Dismiss</span>
        <span className="text-lg leading-none">&times;</span>
      </button>
    </div>
  );
}
