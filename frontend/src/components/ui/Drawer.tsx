"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  headerContent?: ReactNode; // Custom header content (replaces title/subtitle)
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
};

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-full",
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  headerContent,
  children,
  width = "4xl",
}: Props) {
  const showHeader = headerContent || title || subtitle;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          w-full ${widthClasses[width]}
        `}
      >
        {isOpen && (
          <div className="h-full flex flex-col">
            {/* Header */}
            {showHeader && (
              <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b bg-slate-50">
                {headerContent ? (
                  <div className="flex-1 min-w-0">{headerContent}</div>
                ) : (
                  <div>
                    {title && (
                      <h2 className="text-base md:text-lg font-semibold text-slate-900">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="text-xs md:text-sm text-slate-500">{subtitle}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 md:p-2 hover:bg-slate-200 rounded-full transition ml-2 md:ml-4 flex-shrink-0"
                >
                  <X size={18} className="md:w-5 md:h-5 text-slate-600" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>
        )}
      </div>
    </>
  );
}
