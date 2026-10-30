import { useState, useMemo, useEffect } from "react";
import { updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { ProductionJob } from "../types";
import { Search, X, ArrowUp, RotateCcw } from "lucide-react";

type ArchiveSortKey = "jobNo" | "customer" | "job" | "completedAt";
type SortDirection = "asc" | "desc";

interface ArchivePageProps {
  jobs: ProductionJob[];
}

const NINE_MONTHS_MS = 270 * 24 * 60 * 60 * 1000;

export function ArchivePage({ jobs }: ArchivePageProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ArchiveSortKey>("completedAt");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);

  // Auto-delete archived jobs older than 9 months
  useEffect(() => {
    const now = Date.now();
    jobs.forEach(async (job) => {
      if (job.archived) {
        const timestamp = job.completedAt || job.statusSince;
        if (now - timestamp > NINE_MONTHS_MS) {
          await deleteDoc(doc(db, "jobs", job.id));
        }
      }
    });
  }, [jobs]);

  function handleSort(key: ArchiveSortKey) {
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const archivedJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs
      .filter((j) => j.archived)
      .filter((j) =>
        [j.jobNo, j.customer, j.job, j.comments, ...(j.tags || [])].some((val) =>
          String(val || "").toLowerCase().includes(q)
        )
      )
      .sort((a, b) => {
        if (sortKey === "completedAt") {
          const aTime = a.completedAt || a.statusSince || 0;
          const bTime = b.completedAt || b.statusSince || 0;
          return (aTime - bTime) * (direction === "asc" ? 1 : -1);
        }
        const aVal = String(a[sortKey] || "");
        const bVal = String(b[sortKey] || "");
        return aVal.localeCompare(bVal, undefined, { numeric: true }) * (direction === "asc" ? 1 : -1);
      });
  }, [jobs, query, sortKey, direction]);

  async function handlePermanentDelete(jobId: string) {
    await deleteDoc(doc(db, "jobs", jobId));
    setSelectedJob(null);
  }

  async function handleReturnToProduction(jobId: string) {
    await updateDoc(doc(db, "jobs", jobId), {
      archived: false,
      stage: "returns",
      statusSince: Date.now(),
    });
    setSelectedJob(null);
  }

  function formatCompletedDate(timestamp?: number) {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">Archive</h1>
        <p className="mt-2 text-sm text-text-light">
          Completed production. Jobs are automatically cleared after 9 months.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <label className="group flex min-h-12 w-full items-center gap-3 rounded-xl border border-surface-border bg-surface-main px-4 shadow-xs transition focus-within:border-accent-action focus-within:ring-2 focus-within:ring-accent-action/15">
          <Search className="size-5 text-text-light group-focus-within:text-accent-action" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find archived production"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-dark outline-none placeholder:text-text-light"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-xs font-bold text-text-light hover:text-text-dark"
            >
              Clear
            </button>
          )}
        </label>
      </div>

      {/* Sort Buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-text-light">Sort by</span>
        {(
          [
            ["jobNo", "Job Number"],
            ["customer", "Customer"],
            ["completedAt", "Date completed"],
          ] as const
        ).map(([key, label]) => {
          const active = key === sortKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSort(key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-accent-action bg-accent-action text-white"
                  : "border-surface-border bg-surface-main text-text-dark hover:border-slate-400"
              }`}
            >
              {label}
              {active && (
                <ArrowUp
                  className={`size-3 transition-transform ${direction === "desc" ? "rotate-180" : ""}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Archived Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
        <div className="grid grid-cols-[1fr_3fr_3fr_1fr] border-b border-surface-border bg-surface-head px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-light">
          <span>Job</span>
          <span>Customer</span>
          <span>Description</span>
          <span>Completed</span>
        </div>
        <div className="divide-y divide-surface-border/40">
          {archivedJobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setSelectedJob(j)}
              className="grid w-full grid-cols-[1fr_3fr_3fr_1fr] items-center px-6 py-4 text-left transition hover:bg-surface-head/30 focus:bg-surface-head/30 focus:outline-none"
            >
              <span className="font-mono text-sm font-bold text-accent-action">{j.jobNo}</span>
              <span className="truncate pr-4 text-sm font-semibold text-text-dark">{j.customer}</span>
              <span className="truncate pr-4 text-sm text-text-light">{j.job}</span>
              <span className="text-sm text-text-light">{formatCompletedDate(j.completedAt || j.statusSince)}</span>
            </button>
          ))}
          {archivedJobs.length === 0 && (
            <div className="p-10 text-center text-sm font-medium text-text-light">
              {query ? "No matching archived jobs found." : "No archived jobs yet."}
            </div>
          )}
        </div>
      </div>

      {/* Read-Only Job Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setSelectedJob(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  Archived Job {selectedJob.jobNo}
                </p>
                <h2 className="mt-0.5 text-xl font-bold text-text-dark">{selectedJob.job}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                aria-label="Close modal"
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-6 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Customer</span>
                  <p className="mt-1 text-sm font-semibold text-text-dark">{selectedJob.customer}</p>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Date Completed</span>
                  <p className="mt-1 text-sm font-semibold text-text-dark">
                    {formatCompletedDate(selectedJob.completedAt || selectedJob.statusSince)}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Date Start</span>
                  <p className="mt-1 text-sm font-medium text-text-dark">{selectedJob.dateStart || "—"}</p>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Date Due</span>
                  <p className="mt-1 text-sm font-medium text-text-dark">{selectedJob.dateDue || "—"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-light">Tags</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedJob.tags && selectedJob.tags.length > 0 ? (
                    selectedJob.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-surface-border bg-surface-head px-3 py-1 text-xs font-semibold text-text-dark"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-text-light">No tags attached.</p>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-light">Comments</span>
                <div className="mt-1.5 rounded-xl border border-surface-border bg-surface-head/20 p-3.5 text-sm text-text-dark">
                  {selectedJob.comments ? (
                    <p className="whitespace-pre-wrap">{selectedJob.comments}</p>
                  ) : (
                    <p className="text-xs italic text-text-light">No comments provided.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar: Delete permanently or Return to Production */}
            <div className="flex flex-col-reverse justify-between gap-2 border-t border-surface-border bg-surface-head px-6 py-4 sm:flex-row">
              <button
                type="button"
                onClick={() => handlePermanentDelete(selectedJob.id)}
                className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
              >
                Delete permanently
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="rounded-xl border border-surface-border bg-surface-main px-5 py-2.5 text-sm font-bold text-text-dark transition hover:bg-surface-head"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleReturnToProduction(selectedJob.id)}
                  className="flex items-center gap-2 rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  <RotateCcw className="size-4" />
                  Return to production
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}