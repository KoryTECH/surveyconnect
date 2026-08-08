"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { REPORT_REASONS } from "@/lib/contract-reports";

export default function ReportContractModal({
  open,
  contractId,
  onClose,
}: {
  open: boolean;
  contractId?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setDetails("");
      setError("");
      setSubmitted(false);
    }
  }, [open]);

  if (!open) return null;

  const canSubmit = reason !== "" && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !contractId) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/contract-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, reason, details }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit report");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-emerald-200/70 dark:ring-emerald-900/50"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Report this contract
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submitted ? (
            <div className="py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-gray-900 dark:text-white font-medium">
                Report submitted — our team will review it
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Reason
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="" disabled>
                    Select a reason...
                  </option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Details (optional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tell us what happened..."
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
