import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { ProductionJob, ProductionStage } from "../types";
import { Plus, X } from "lucide-react";

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
  const [addingJob, setAddingJob] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [jobDraft, setJobDraft] = useState<ProductionJob | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState<ProductionStage | "">("");
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
    if (job) setJobDraft({ ...job, tags: [...job.tags] });
    onJobOpened();
  }, [jobs, onJobOpened, openJobId]);

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function beginEditingTag(tag: string) {
    setEditingTag(tag);
    setEditingValue(tag);
  }

  function saveTagName() {
    if (!editingTag) return;
    const nextName = editingValue.trim();
    if (!nextName) return;
    setTags((current) => current.map((tag) => (tag === editingTag ? nextName : tag)));
    setSelectedTags((current) => current.map((tag) => (tag === editingTag ? nextName : tag)));
    setEditingTag(null);
  }

  function deleteTag(tag: string) {
    setTags((current) => current.filter((item) => item !== tag));
    setSelectedTags((current) => current.filter((item) => item !== tag));
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

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStage) return;
    const form = new FormData(event.currentTarget);

    await addDoc(collection(db, "jobs"), {
      jobNo: String(form.get("jobNo") ?? "").trim(),
      customer: String(form.get("customer") ?? "").trim(),
      job: String(form.get("job") ?? "").trim(),
      dateStart: String(form.get("dateStart") ?? ""),
      dateDue: String(form.get("dateDue") ?? ""),
      stage: selectedStage,
      tags: selectedTags,
      comments: String(form.get("comments") ?? "").trim(),
      statusSince: Date.now(),
      archived: false,
    });

    setSelectedStage("");
    setSelectedTags([]);
    setAddingJob(false);
    event.currentTarget.reset();
  }

  async function saveJobDraft(archive = false) {
    if (!jobDraft) return;
    const jobRef = doc(db, "jobs", jobDraft.id);
    const existing = jobs.find((j) => j.id === jobDraft.id);

    await updateDoc(jobRef, {
      ...jobDraft,
      statusSince: existing && existing.stage === jobDraft.stage ? existing.statusSince : Date.now(),
      archived: archive || jobDraft.archived,
      completedAt: archive ? Date.now() : (jobDraft.completedAt || null),
    });

    setJobDraft(null);
  }

  async function deleteJob() {
    if (!jobDraft) return;
    await deleteDoc(doc(db, "jobs", jobDraft.id));
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
      <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">Production WIP</h1>
          <p className="mt-2 text-sm text-text-light">
          Jobs currently in production, sorted by their current status and urgency
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingJob((current) => !current)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2"
        >
          <Plus className="size-4" />
          {addingJob ? "Hide fields" : "Add job"}
        </button>
      </div>

      {/* Add Job Form */}
      {addingJob && (
        <form onSubmit={saveJob} className="mb-10 rounded-2xl border border-surface-border bg-surface-main p-5 shadow-xs sm:p-7">
          <div className="mb-5">
            <p className="text-lg font-bold text-text-dark">Add job</p>
            <p className="mt-1 text-sm text-text-light">
              Enter job details, choose its status, and add any relevant tags.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="form-label">
              Job No.
              <input name="jobNo" required className="field mt-2" />
            </label>
            <label className="form-label">
              Customer
              <input name="customer" required className="field mt-2" />
            </label>
            <label className="form-label">
              Job
              <input name="job" required className="field mt-2" />
            </label>
            <label className="form-label">
              Date Start
              <input name="dateStart" type="date" required className="field mt-2" />
            </label>
            <label className="form-label">
              Date Due
              <input name="dateDue" type="date" required className="field mt-2" />
            </label>
            <label className="form-label">
              Status
              <select
                required
                value={selectedStage}
                onChange={(event) => setSelectedStage(event.target.value as ProductionStage | "")}
                className="field mt-2"
              >
                <option value="">Choose status</option>
                {productionStages.slice().reverse().map((stage) => (
                  <option key={stage.key} value={stage.key}>{stage.label}</option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="form-label">Tags</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
                      selected ? "border-accent-action bg-accent-action text-white" : "border-surface-border bg-surface-main text-text-dark hover:border-slate-400"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${selected ? "bg-white" : "bg-surface-border"}`} />
                    {tag}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTagModalOpen(true)}
                className="rounded-full border border-dashed border-surface-border bg-surface-main px-3 py-2 text-sm font-bold text-text-light hover:border-accent-action hover:text-accent-action"
              >
                Edit tags
              </button>
            </div>
          </fieldset>

          <label className="form-label mt-5 block">
            Comments
            <textarea
              name="comments"
              rows={4}
              className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3 text-sm text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
            />
          </label>

          <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs font-semibold text-text-light">
              {selectedStage ? "Status selected" : "Choose a status before saving"}
            </p>
            <button
              type="submit"
              disabled={!selectedStage}
              className="min-h-11 rounded-xl bg-accent-action px-7 text-sm font-bold text-white shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save job
            </button>
          </div>
        </form>
      )}

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
                      onClick={() => setJobDraft({ ...job, tags: [...job.tags] })}
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
      {/* Edit Job Modal */}
      {jobDraft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => saveJobDraft()}>
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface-main shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface-main px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">Job {jobDraft.jobNo}</p>
                <h2 className="mt-1 text-xl font-bold text-text-dark">Edit job details</h2>
              </div>
              <button
                type="button"
                onClick={() => saveJobDraft()}
                aria-label="Close dialog"
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-head hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="form-label">
                  Job No.
                  <input
                    value={jobDraft.jobNo}
                    onChange={(e) => setJobDraft({ ...jobDraft, jobNo: e.target.value })}
                    className="field mt-2"
                  />
                </label>
                <label className="form-label">
                  Customer
                  <input
                    value={jobDraft.customer}
                    onChange={(e) => setJobDraft({ ...jobDraft, customer: e.target.value })}
                    className="field mt-2"
                  />
                </label>
                <label className="form-label sm:col-span-2">
                  Job
                  <input
                    value={jobDraft.job}
                    onChange={(e) => setJobDraft({ ...jobDraft, job: e.target.value })}
                    className="field mt-2"
                  />
                </label>
                <label className="form-label">
                  Date Start
                  <input
                    type="date"
                    value={jobDraft.dateStart}
                    onChange={(e) => setJobDraft({ ...jobDraft, dateStart: e.target.value })}
                    className="field mt-2"
                  />
                </label>
                <label className="form-label">
                  Date Due
                  <input
                    type="date"
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
                <legend className="form-label">Tags</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = jobDraft.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDraftTag(tag)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition ${
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
                  rows={5}
                  value={jobDraft.comments}
                  onChange={(e) => setJobDraft({ ...jobDraft, comments: e.target.value })}
                  className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3 text-sm text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
                />
              </label>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-surface-border bg-surface-head px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={deleteJob}
                className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
              >
                Delete
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => saveJobDraft()}
                  className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => saveJobDraft(true)}
                  className="rounded-xl bg-accent-secondary px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {tagModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => setTagModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-main shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
              <div>
                <h2 className="font-bold text-text-dark">Edit tags</h2>
                <p className="mt-1 text-xs text-text-light">Rename, remove, or create tags.</p>
              </div>
              <button
                type="button"
                onClick={() => setTagModalOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-head hover:text-text-dark"
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

            <div className="border-t border-surface-border p-4">
              <div className="flex gap-2">
                <button type="button" onClick={addNewTag} className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-bold text-text-dark hover:bg-surface-head">
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