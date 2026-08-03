"use client";

import { X, Building2, QrCode, Smartphone, CheckCircle2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  {
    icon: Building2,
    title: "Create or open a branch",
    body: "Add a branch from Branches, then open it to manage POS activation, sales, and inventory.",
  },
  {
    icon: QrCode,
    title: "Generate an activation code",
    body: "On the branch page, use POS Activation to create a one-time code and QR. The raw token is shown only once and expires in 24 hours.",
  },
  {
    icon: Smartphone,
    title: "Activate the POS device",
    body: "On the POS device, open the activation page and scan the QR — or enter the code manually. That links the terminal to this branch.",
  },
  {
    icon: CheckCircle2,
    title: "Manage access anytime",
    body: "Revoke a code if it isn’t used, or revoke a terminal to disconnect a device. Generate a new code when you need to activate another POS.",
  },
];

export default function OwnerSetupGuideModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-setup-guide-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <div>
            <h2
              id="owner-setup-guide-title"
              className="text-lg font-semibold text-slate-900"
            >
              Branch setup guide
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              How to connect POS devices to the branches you manage using QR
              codes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <ol className="p-5 space-y-4">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="flex gap-3">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-emerald-700 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {title}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
