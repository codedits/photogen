"use client";

import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
    >
      <button
        aria-label="Close confirmation dialog"
        onClick={onCancel}
        disabled={loading}
        className="absolute inset-0 bg-black/70"
      />

      <div className="relative w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 sm:p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 rounded-md border border-red-900/70 bg-red-950/40 p-2 text-red-300">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-base font-medium text-zinc-100">{title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="focus-ring rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="focus-ring rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200 hover:bg-red-950 disabled:opacity-50"
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
