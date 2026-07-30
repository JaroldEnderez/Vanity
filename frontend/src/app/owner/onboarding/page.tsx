"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2 } from "lucide-react";

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/owner/branches");
        if (!res.ok) {
          if (!cancelled) setChecking(false);
          return;
        }
        const branches = await res.json();
        if (!cancelled && Array.isArray(branches) && branches.length > 0) {
          router.replace("/owner");
          return;
        }
      } catch {
        // stay on onboarding
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/owner/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create branch");
        return;
      }
      router.push(`/owner/branches/${data.id}`);
    } catch {
      setError("Failed to create branch");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="text-emerald-600" size={28} />
          <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
        </div>
        <p className="text-slate-600 mb-8">
          Create your first branch to get started. We&apos;ll set up default
          services and materials for you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="branchName"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Branch Name
            </label>
            <input
              id="branchName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main Branch"
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </span>
            ) : (
              "Create branch"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
