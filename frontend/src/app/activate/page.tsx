"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

function ActivateInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Activating this device…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing activation token. Open the QR or URL from the owner dashboard.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/pos/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Activation failed");
          return;
        }
        setStatus("ok");
        setMessage(`Activated as ${data.branchName ?? "branch"} POS`);
        setTimeout(() => {
          window.location.href = "/dashboard/orders";
        }, 800);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Activation failed");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        {status === "working" && (
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
        )}
        {status === "ok" && (
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
        )}
        {status === "error" && (
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
        )}
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {status === "ok"
            ? "POS Activated"
            : status === "error"
              ? "Activation failed"
              : "Activating"}
        </h1>
        <p className="text-slate-600 text-sm">{message}</p>
        {status === "error" && (
          <a
            href="/pos"
            className="inline-block mt-6 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Enter code manually
          </a>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <ActivateInner />
    </Suspense>
  );
}
