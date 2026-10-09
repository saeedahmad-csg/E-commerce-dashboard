'use client';

import React, { useState } from 'react';
import { X, RefreshCw, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (csvUrl: string) => Promise<void>;
  onSyncServiceAccount: () => Promise<void>;
  onResetSample: () => void;
  onClearSheet?: () => Promise<void>;
  onPopulateBatch?: (count: number) => Promise<void>;
  isLoading: boolean;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  onSync,
  onSyncServiceAccount,
  onResetSample,
  onClearSheet,
  onPopulateBatch,
  isLoading,
}) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);



  if (!isOpen) return null;

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!sheetUrl.trim()) {
      setError('Please provide a Google Sheets published CSV URL.');
      return;
    }

    try {
      await onSync(sheetUrl.trim());
      setSuccess('Successfully synchronized orders from Google Sheet!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch or parse CSV from provided URL.');
      } else {
        setError('Failed to fetch or parse CSV from provided URL.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Sync Google Sheet
              </h3>
              <p className="text-xs text-zinc-500">Live integration for sales & orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Connected Service Account
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                <code>kira-l@gen-lang-client-0764638400.iam.gserviceaccount.com</code>
              </p>
            </div>
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                setError(null);
                setSuccess(null);
                try {
                  await onSyncServiceAccount();
                  setSuccess('Successfully pulled latest orders via Service Account API!');
                  setTimeout(() => onClose(), 1200);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Failed to connect via API');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Sync via API
            </button>
          </div>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <span className="relative bg-white dark:bg-zinc-900 px-3 text-[11px] font-medium text-zinc-400">
            OR SYNC VIA CSV LINK
          </span>
        </div>

        <form onSubmit={handleSyncSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Published Google Sheet CSV Link
            </label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 border border-zinc-200/60 dark:border-zinc-700/60">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">How to get this link in Google Sheets:</p>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Click <strong>File</strong> &gt; <strong>Share</strong> &gt; <strong>Publish to web</strong>.</li>
              <li>Select <strong>Entire Document</strong> (or Sheet tab) and choose <strong>Comma-separated values (.csv)</strong>.</li>
              <li>Click <strong>Publish</strong> and copy the generated link.</li>
            </ol>
            <p className="text-zinc-400 pt-1">
              Expected columns: <code>Order_ID, Customer_Name, Product_Name, Category, Amount_USD, Status, Order_Date</code>
            </p>
          </div>

          {/* Quick Bulk Generation Tool */}
          {onPopulateBatch && (
              <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      Populate 6,769 US Orders ($20 - $50)
                    </h4>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                      6,400 completed, <strong>302 to be fulfilled (pending)</strong>, and <strong>67 cancelled</strong>. Auto-writes to your live Google Sheet.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading || isClearing || isPopulating}
                    onClick={async () => {
                      setIsPopulating(true);
                      setError(null);
                      setSuccess(null);
                      try {
                        await onPopulateBatch(6769);
                        setSuccess('6,769 orders uploaded to Google Sheet and synced!');
                        setTimeout(() => onClose(), 1500);
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : 'Failed to populate orders');
                      } finally {
                        setIsPopulating(false);
                      }
                    }}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isPopulating ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Uploading...
                      </span>
                    ) : (
                      'Populate & Sync'
                    )}
                  </button>
                </div>
              </div>
            )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onResetSample();
                  setSuccess('Reset back to sample mock orders.');
                  setTimeout(() => onClose(), 1000);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline"
              >
                Reset to Sample
              </button>

              {onClearSheet && (
                <button
                  type="button"
                  disabled={isLoading || isClearing}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      'Are you sure you want to delete all order records from the Google Sheet? Headers will remain.'
                    );
                    if (!confirmed) return;
                    setIsClearing(true);
                    setError(null);
                    setSuccess(null);
                    try {
                      await onClearSheet();
                      setSuccess('Successfully deleted all rows from Google Sheet!');
                      setTimeout(() => onClose(), 1500);
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Failed to clear sheet');
                    } finally {
                      setIsClearing(false);
                    }
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-medium underline disabled:opacity-50"
                >
                  {isClearing ? 'Clearing Sheet...' : 'Wipe Sheet Data'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isClearing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Live Sheet'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
