import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ProductionJob, ProductionStage } from "../types";
import { X } from "lucide-react";

export const productionStages: { key: ProductionStage; label: string }[] = [
  { key: "danger", label: "Danger Zone" },
  { key: "day3", label: "Day 3" },
  { key: "day2", label: "Day 2" },
  { key: "day1", label: "Day 1" },
  { key: "returns", label: "Returns" },
];

const stageDayValue: Record<Exclude<ProductionStage, "returns">, number> = {
  day3: 3,
  day2: 2,
  day1: 1,
  danger: 0,
};

function calendarDaysSince(timestamp: number, now: Date) {
  const start = new Date(timestamp);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.floor((currentDay - startDay) / 86_400_000));
}

export function effectiveStage(job: ProductionJob, now: Date): ProductionStage {
  if (job.stage === "returns") return "returns";
  const remainingDays = stageDayValue[job.stage] - calendarDaysSince(job.statusSince, now);
  if (remainingDays >= 3) return "day3";
  if (remainingDays === 2) return "day2";
  if (remainingDays === 1) return "day1";
  return "danger";
}

interface ProductionPageProps {
  jobs: ProductionJob[];
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  openJobId: string | null;
  onJobOpened: () => void;
}

export function ProductionPage({
  jobs,
  tags,
  setTags,
  openJobId,
  onJobOpened,
}: ProductionPageProps) {
  const [now, setNow] = useState(() => new Date());
  const [viewingJob, setViewingJob] = useState<ProductionJob | null>(null);
  const [jobDraft, setJobDraft] = useState<{
    id: string | null;
    jobNo: string;
    customer: string;
    job: string;
    dateStart: string;
    dateDue: string;
    stage: ProductionStage;
    tags: string[];
    comments: string;
    statusSince?: number;
    archived?: boolean;
    completedAt?: number;
  } | null>(null);

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!openJobId) return;
    const job = jobs.find((item) => item.id === openJobId);
    if (job) setViewingJob(job);
    onJobOpened();
  }, [jobs, onJobOpened, openJobId]);

  function beginEditingTag(tag: string) {
    setEditingTag(tag);
    setEditingValue(tag);
  }

  function saveTagName() {
    if (!editingTag) return;
    const nextName = editingValue.trim();
    if (!nextName) return;
    setTags((current) => current.map((tag) => (tag === editingTag ? nextName : tag)));
    setEditingTag(null);
  }

  function deleteTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
    if (editingTag === tag) setEditingTag(null);
  }

  function addNewTag() {
    let nextTag = "New tag";
    let suffix = 2;
    while (tags.includes(nextTag)) {
      nextTag = `New tag ${suffix}`;
      suffix += 1;
    }
    setTags((current) => [...current, nextTag]);
    beginEditingTag(nextTag);
  }

  async function handleDeleteJob(jobId: string) {
    await deleteDoc(doc(db, "jobs", jobId));
    if (viewingJob?.id === jobId) setViewingJob(null);
    if (jobDraft?.id === jobId) setJobDraft(null);
  }

  function handleEditFromView() {
    if (!viewingJob) return;
    setJobDraft({
      id: viewingJob.id,
      jobNo: viewingJob.jobNo,
      customer: viewingJob.customer,
      job: viewingJob.job,
      dateStart: viewingJob.dateStart,
      dateDue: viewingJob.dateDue,
      stage: viewingJob.stage,
      tags: [...viewingJob.tags],
      comments: viewingJob.comments,
      statusSince: viewingJob.statusSince,
      archived: viewingJob.archived,
      completedAt: viewingJob.completedAt,
    });
    setViewingJob(null);
  }

  async function handleSaveJobDraft(archive = false) {
    if (!jobDraft) return;

    if (jobDraft.id === null) {
      // Adding new job
      await addDoc(collection(db, "jobs"), {
        jobNo: jobDraft.jobNo.trim(),
        customer: jobDraft.customer.trim(),
        job: jobDraft.job.trim(),
        dateStart: jobDraft.dateStart,
        dateDue: jobDraft.dateDue,
        stage: jobDraft.stage,
        tags: jobDraft.tags,
        comments: jobDraft.comments.trim(),
        statusSince: Date.now(),
        archived: false,
      });
    } else {
      // Editing existing job
      const jobRef = doc(db, "jobs", jobDraft.id);
      const existing = jobs.find((j) => j.id === jobDraft.id);

      await updateDoc(jobRef, {
        jobNo: jobDraft.jobNo.trim(),
        customer: jobDraft.customer.trim(),
        job: jobDraft.job.trim(),
        dateStart: jobDraft.dateStart,
        dateDue: jobDraft.dateDue,
        stage: jobDraft.stage,
        tags: jobDraft.tags,
        comments: jobDraft.comments.trim(),
        statusSince: existing && existing.stage === jobDraft.stage ? existing.statusSince : Date.now(),
        archived: archive || jobDraft.archived,
        completedAt: archive ? Date.now() : (jobDraft.completedAt || null),
      });
    }

    setJobDraft(null);
  }

  function toggleDraftTag(tag: string) {
    if (!jobDraft) return;
    setJobDraft({
      ...jobDraft,
      tags: jobDraft.tags.includes(tag)
        ? jobDraft.tags.filter((item) => item !== tag)
        : [...jobDraft.tags, tag],
    });
  }

  return (
    <section id="production-panel" role="tabpanel" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">Production WIP</h1>
          <p className="mt-2 text-sm text-text-light">
            Jobs currently in production, sorted by their current status.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setJobDraft({
              id: null,
              jobNo: "",
              customer: "",
              job: "",
              dateStart: "",
              dateDue: "",
              stage: "day3",
              tags: [],
              comments: "",
            })
          }
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2"
        >
          Add job
        </button>
      </div>

      {/* Production Stages Grid */}
      <div className="space-y-4">
        {productionStages.map((stage) => {
          const stageJobs = jobs.filter((job) => !job.archived && effectiveStage(job, now) === stage.key);
          return (
            <section key={stage.key} className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
              <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-4 py-3 sm:px-7">
                <h2 className="text-sm font-bold text-text-dark">{stage.label}</h2>
                <span className="text-xs font-bold text-text-light">{stageJobs.length}</span>
              </div>
              <div className="grid min-h-32 grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-5">
                {stageJobs.map((job) => {
                  const elapsedDays = calendarDaysSince(job.statusSince, now);
                  const trackedDays =
                    stage.key === "danger" && job.stage !== "returns"
                      ? Math.max(0, elapsedDays - stageDayValue[job.stage])
                      : elapsedDays;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setViewingJob(job)}
                      className={`flex aspect-square w-full flex-col border p-3.5 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2 sm:p-5 ${
                        stage.key === "danger"
                          ? "border-stage-danger-border bg-stage-danger-bg"
                          : stage.key === "returns"
                            ? "border-stage-returns-border bg-stage-returns-bg"
                            : "border-stage-day-border bg-stage-day-bg"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 sm:gap-3">
                        <span className="font-mono text-xs font-bold text-accent-action sm:text-sm">{job.jobNo}</span>
                      </div>
                      <div className="mt-2.5 min-h-0 flex-1 sm:mt-5">
                        <p className="line-clamp-2 text-xs font-bold leading-snug text-text-dark sm:line-clamp-3 sm:text-base">
                          {job.job}
                        </p>
                        <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-text-light sm:mt-2 sm:line-clamp-2 sm:text-sm">
                          {job.customer}
                        </p>
                      </div>
                      <div className="mt-2.5 border-t border-surface-border/40 pt-2 text-[10px] font-semibold text-text-light sm:mt-4 sm:pt-3 sm:text-xs">
                        <p>Due {job.dateDue}</p>
                        {(stage.key === "danger" || stage.key === "returns") && (
                          <p className={`mt-1 font-bold ${stage.key === "danger" ? "text-stage-danger-text" : "text-stage-returns-text"}`}>
                            {trackedDays} {trackedDays === 1 ? "day" : "days"} in {stage.label}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Read-Only View Job Modal */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => setViewingJob(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">Job {viewingJob.jobNo}</p>
                <h2 className="mt-0.5 text-xl font-bold text-text-dark">{viewingJob.job}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                aria-label="Close dialog"
                className="grid size-8 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-6 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Customer</span>
                  <p className="mt-1 text-sm font-semibold text-text-dark">{viewingJob.customer}</p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Current Status</span>
                  <p className="mt-1 text-sm font-semibold text-text-dark">
                    {productionStages.find((s) => s.key === viewingJob.stage)?.label ?? viewingJob.stage}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Date Start</span>
                  <p className="mt-1 text-sm font-medium text-text-dark">{viewingJob.dateStart || "—"}</p>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-light">Date Due</span>
                  <p className="mt-1 text-sm font-medium text-text-dark">{viewingJob.dateDue || "—"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-light">Tags</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {viewingJob.tags && viewingJob.tags.length > 0 ? (
                    viewingJob.tags.map((t) => (
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
                  {viewingJob.comments ? (
                    <p className="whitespace-pre-wrap">{viewingJob.comments}</p>
                  ) : (
                    <p className="text-xs italic text-text-light">No comments provided.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-surface-border bg-surface-head px-6 py-4">
              <button
                type="button"
                onClick={() => handleDeleteJob(viewingJob.id)}
                className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEditFromView}
                  className="flex items-center gap-2 rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  Edit job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Add / Edit Job Modal */}
      {jobDraft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => setJobDraft(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  {jobDraft.id === null ? "New Production Job" : `Job ${jobDraft.jobNo}`}
                </p>
                <h2 className="mt-0.5 text-xl font-bold text-text-dark">
                  {jobDraft.id === null ? "Add Job" : "Edit Job"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setJobDraft(null)}
                aria-label="Close dialog"
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveJobDraft(false);
              }}
            >
              <div className="p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="form-label">
                    Job No.
                    <input
                      required
                      value={jobDraft.jobNo}
                      onChange={(e) => setJobDraft({ ...jobDraft, jobNo: e.target.value })}
                      className="field mt-2"
                      placeholder="e.g. 12454"
                    />
                  </label>
                  <label className="form-label">
                    Customer
                    <input
                      required
                      value={jobDraft.customer}
                      onChange={(e) => setJobDraft({ ...jobDraft, customer: e.target.value })}
                      className="field mt-2"
                      placeholder="Customer name"
                    />
                  </label>
                  <label className="form-label sm:col-span-2">
                    Job
                    <input
                      required
                      value={jobDraft.job}
                      onChange={(e) => setJobDraft({ ...jobDraft, job: e.target.value })}
                      className="field mt-2"
                      placeholder="Job description"
                    />
                  </label>
                  <label className="form-label">
                    Date Start
                    <input
                      type="date"
                      required
                      value={jobDraft.dateStart}
                      onChange={(e) => setJobDraft({ ...jobDraft, dateStart: e.target.value })}
                      className="field mt-2"
                    />
                  </label>
                  <label className="form-label">
                    Date Due
                    <input
                      type="date"
                      required
                      value={jobDraft.dateDue}
                      onChange={(e) => setJobDraft({ ...jobDraft, dateDue: e.target.value })}
                      className="field mt-2"
                    />
                  </label>
                  <label className="form-label sm:col-span-2">
                    Status
                    <select
                      value={jobDraft.stage}
                      onChange={(e) => setJobDraft({ ...jobDraft, stage: e.target.value as ProductionStage })}
                      className="field mt-2"
                    >
                      {productionStages.slice().reverse().map((stage) => (
                        <option key={stage.key} value={stage.key}>{stage.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <fieldset className="mt-5">
                  <div className="flex items-center justify-between">
                    <legend className="form-label">Tags</legend>
                    <button
                      type="button"
                      onClick={() => setTagModalOpen(true)}
                      className="text-xs font-bold text-accent-action hover:underline"
                    >
                      Edit tag list
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = jobDraft.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleDraftTag(tag)}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                            selected ? "border-accent-action bg-accent-action text-white" : "border-surface-border bg-surface-main text-text-dark hover:border-slate-400"
                          }`}
                        >
                          <span className={`size-2 rounded-full ${selected ? "bg-white" : "bg-surface-border"}`} />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="form-label mt-5 block">
                  Comments
                  <textarea
                    rows={4}
                    value={jobDraft.comments}
                    onChange={(e) => setJobDraft({ ...jobDraft, comments: e.target.value })}
                    className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3 text-sm text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
                    placeholder="Add comments..."
                  />
                </label>
              </div>

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-surface-border bg-surface-head px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
                {jobDraft.id !== null ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(jobDraft.id!)}
                    className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  {jobDraft.id !== null && (
                    <button
                      type="button"
                      onClick={() => handleSaveJobDraft(true)}
                      className="rounded-xl bg-accent-secondary px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                  >
                    {jobDraft.id === null ? "Save job" : "Save"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => setTagModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4">
              <div>
                <h2 className="font-bold text-text-dark">Edit tags</h2>
                <p className="mt-1 text-xs text-text-light">Rename, remove, or create tags.</p>
              </div>
              <button
                type="button"
                onClick={() => setTagModalOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-3">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center gap-2 rounded-xl p-2 hover:bg-surface-head/40">
                  {editingTag === tag ? (
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={saveTagName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTagName();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-accent-action px-3 py-2 text-sm font-semibold outline-none ring-2 ring-accent-action/15"
                    />
                  ) : (
                    <button type="button" onClick={() => beginEditingTag(tag)} className="flex-1 px-2 py-2 text-left text-sm font-semibold text-text-dark">
                      {tag}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteTag(tag)}
                    className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-red-50 hover:text-accent-alert"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border bg-surface-head p-4">
              <div className="flex gap-2">
                <button type="button" onClick={addNewTag} className="flex-1 rounded-xl border border-surface-border bg-surface-main px-4 py-2.5 text-sm font-bold text-text-dark hover:bg-surface-head">
                  Add tag
                </button>
                <button type="button" onClick={() => setTagModalOpen(false)} className="rounded-xl bg-text-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}