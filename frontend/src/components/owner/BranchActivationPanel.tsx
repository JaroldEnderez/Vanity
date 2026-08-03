"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, KeyRound, QrCode, Copy, Check, Ban } from "lucide-react";

type ActivationStatus = {
  isActivated: boolean;
  status: "Activated" | "Not Activated";
  terminals: Array<{
    id: string;
    name: string;
    activatedAt: string;
    lastSeenAt: string | null;
    revokedAt: string | null;
  }>;
  pendingCode: {
    id: string;
    expiresAt: string;
    createdAt: string;
  } | null;
};

type GeneratedCode = {
  token: string;
  expiresAt: string;
  activationUrl: string;
};

export default function BranchActivationPanel({ branchId }: { branchId: string }) {
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevokeCodes, setConfirmRevokeCodes] = useState(false);
  const [confirmRevokeTerminalId, setConfirmRevokeTerminalId] = useState<string | null>(
    null
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/owner/branches/${branchId}/activation`);
      if (!res.ok) {
        setError("Failed to load activation status");
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch {
      setError("Failed to load activation status");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/owner/branches/${branchId}/activation`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to generate code");
        return;
      }
      setGenerated({
        token: data.token,
        expiresAt: data.expiresAt,
        activationUrl: data.activationUrl,
      });
      await load();
    } catch {
      setError("Failed to generate code");
    } finally {
      setBusy(false);
    }
  };

  const revokeCodes = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/branches/${branchId}/activation`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to revoke codes");
        return;
      }
      setGenerated(null);
      setConfirmRevokeCodes(false);
      await load();
    } catch {
      setError("Failed to revoke codes");
    } finally {
      setBusy(false);
    }
  };

  const revokeTerminal = async (terminalId: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/branches/${branchId}/terminals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminalId }),
      });
      if (!res.ok) {
        setError("Failed to revoke terminal");
        return;
      }
      setConfirmRevokeTerminalId(null);
      await load();
    } catch {
      setError("Failed to revoke terminal");
    } finally {
      setBusy(false);
    }
  };

  const terminalPendingRevoke = confirmRevokeTerminalId
    ? status?.terminals.find((t) => t.id === confirmRevokeTerminalId)
    : null;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading activation…
      </div>
    );
  }

  const qrUrl = generated
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generated.activationUrl)}`
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <KeyRound size={20} />
            POS Activation
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Status:{" "}
            <span
              className={
                status?.isActivated
                  ? "text-emerald-700 font-medium"
                  : "text-amber-700 font-medium"
              }
            >
              {status?.status ?? "Not Activated"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode size={16} />
            )}
            {generated || status?.pendingCode
              ? "Regenerate Activation Code"
              : "Generate Activation Code"}
          </button>
          {(generated || status?.pendingCode) && (
            <button
              type="button"
              onClick={() => setConfirmRevokeCodes(true)}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg"
            >
              Revoke code
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {generated && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <p className="text-sm text-slate-700">
            Show this code or QR on the POS device. The raw token is only shown
            once.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {qrUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Activation QR code"
                width={160}
                height={160}
                className="rounded-lg bg-white border border-slate-200"
              />
            )}
            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Activation code
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs sm:text-sm font-mono break-all text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 flex-1">
                    {generated.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(generated.token)}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                    aria-label="Copy code"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Activation URL
                </p>
                <p className="text-xs font-mono break-all text-slate-700 mt-1">
                  {generated.activationUrl}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Expires{" "}
                {new Date(generated.expiresAt).toLocaleString("en-PH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {!generated && status?.pendingCode && (
        <p className="text-sm text-slate-600">
          An unused activation code is pending (expires{" "}
          {new Date(status.pendingCode.expiresAt).toLocaleString("en-PH", {
            dateStyle: "short",
            timeStyle: "short",
          })}
          ). Generate again to create a new code — the previous raw token cannot
          be recovered.
        </p>
      )}

      {status && status.terminals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Active terminals
          </h3>
          <ul className="space-y-2">
            {status.terminals.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    Activated{" "}
                    {new Date(t.activatedAt).toLocaleString("en-PH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {t.lastSeenAt
                      ? ` · Last seen ${new Date(t.lastSeenAt).toLocaleString(
                          "en-PH",
                          { dateStyle: "short", timeStyle: "short" }
                        )}`
                      : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmRevokeTerminalId(t.id)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg disabled:opacity-50"
                >
                  <Ban size={14} />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmRevokeCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-code-title"
          >
            <h3
              id="revoke-code-title"
              className="text-lg font-semibold text-slate-900 mb-1"
            >
              Revoke activation code?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              The unused code will stop working. Anyone with the QR or code will
              no longer be able to activate a POS for this branch until you
              generate a new one.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRevokeCodes(false)}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={revokeCodes}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Revoke code
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRevokeTerminalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-terminal-title"
          >
            <h3
              id="revoke-terminal-title"
              className="text-lg font-semibold text-slate-900 mb-1"
            >
              Revoke this terminal?
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              {terminalPendingRevoke
                ? `“${terminalPendingRevoke.name}” will be disconnected from this branch and will need a new activation code to reconnect.`
                : "This terminal will be disconnected from this branch and will need a new activation code to reconnect."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRevokeTerminalId(null)}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => revokeTerminal(confirmRevokeTerminalId)}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Revoke terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
