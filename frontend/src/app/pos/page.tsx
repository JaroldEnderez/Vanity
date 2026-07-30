"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, KeyRound, QrCode } from "lucide-react";

export default function PosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPosSession =
    (session?.user?.role === "terminal" || session?.user?.role === "branch") &&
    !!session.user.branchId;

  useEffect(() => {
    if (status === "loading") return;
    if (isPosSession) {
      router.replace("/dashboard/orders");
    }
  }, [status, isPosSession, router]);

  const activate = async (code: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Activation failed");
        return;
      }
      // Full reload so NextAuth session picks up the new cookie
      window.location.href = "/dashboard/orders";
    } catch {
      setError("Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    await activate(token);
  };

  if (status === "loading" || isPosSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="text-emerald-600" size={28} />
          <h1 className="text-2xl font-bold text-slate-900">POS Activation</h1>
        </div>
        <p className="text-slate-600 mb-6">
          Enter Activation Code or scan the QR from the owner dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="activationCode"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Activation Code
            </label>
            <input
              id="activationCode"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste code here"
              autoComplete="off"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !token.trim()}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Activating…
              </span>
            ) : (
              "Activate this device"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <QrCode size={16} />
            Scan QR Code opens this flow via /activate
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Or{" "}
            <a href="/login" className="text-emerald-600 hover:underline">
              sign in with a branch account
            </a>{" "}
            (legacy)
          </p>
        </div>
      </div>
    </div>
  );
}
