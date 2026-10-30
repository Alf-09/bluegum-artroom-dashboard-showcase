import { useState } from "react";
import type { FormEvent } from "react";
import { updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { ThreadColor, ProductionJob, Note, Tab, ProductionStage, NoteColor } from "../types";
import { productionStages, effectiveStage } from "./ProductionPage";
import { notePalette } from "./NotesPage";
import { X } from "lucide-react";

interface DashboardPageProps {
  colors: ThreadColor[];
  jobs: ProductionJob[];
  notes: Note[];
  tags?: string[];
  onNavigate: (tab: Tab) => void;
  onOpenJob: (jobId: string) => void;
  onOpenNote: (noteId: string) => void;
}

export function DashboardPage({
  colors,
  jobs,
  notes,
  tags = [],
  onNavigate,
}: DashboardPageProps) {
  const currentDate = new Date();
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

  // Direct Note Viewer & Editor States
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [noteDraft, setNoteDraft] = useState<{
    id: string;
    title: string;
    text: string;
    color: NoteColor;
  } | null>(null);

  const urgentJobs = [...jobs]
    .filter((job) => !job.archived)
    .sort((a, b) => a.statusSince - b.statusSince)
    .slice(0, 5);
  const recentColors = [...colors].slice(-5).reverse();
  const recentNotes = [...notes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

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
    if (!jobDraft || jobDraft.id === null) return;
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

  async function handleDeleteNote(noteId: string) {
    await deleteDoc(doc(db, "notes", noteId));
    if (viewingNote?.id === noteId) setViewingNote(null);
    if (noteDraft?.id === noteId) setNoteDraft(null);
  }

  function handleEditNoteFromView() {
    if (!viewingNote) return;
    setNoteDraft({
      id: viewingNote.id,
      title: viewingNote.title,
      text: viewingNote.text,
      color: viewingNote.color,
    });
    setViewingNote(null);
  }

  async function handleSaveNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noteDraft) return;

    await updateDoc(doc(db, "notes", noteDraft.id), {
      title: noteDraft.title.trim(),
      text: noteDraft.text.trim(),
      color: noteDraft.color,
      viewedAt: Date.now(),
    });

    setNoteDraft(null);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-text-light">
          Quick overview of the artroom's current production, thread colours, and notes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs sm:col-span-2">
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
            <div>
              <h2 className="font-bold text-text-dark">Production Jobes</h2>
              <p className="mt-1 text-xs font-medium text-text-light">
                Jobs that need attention
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("production")}
              className="text-sm font-bold text-accent-action transition hover:opacity-80"
            >
              More
            </button>
          </div>
          {urgentJobs.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-5">
              {urgentJobs.map((job) => {
                const stage = effectiveStage(job, currentDate);
                const stageLabel =
                  productionStages.find((item) => item.key === stage)?.label ?? stage;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setViewingJob(job)}
                    className={`flex aspect-square flex-col border p-3.5 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2 sm:p-4 ${
                      stage === "danger"
                        ? "border-stage-danger-border bg-stage-danger-bg"
                        : stage === "returns"
                          ? "border-stage-returns-border bg-stage-returns-bg"
                          : "border-stage-day-border bg-stage-day-bg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-accent-action sm:text-xs">
                        {job.jobNo}
                      </span>
                      <span className="truncate text-[10px] font-bold text-text-light sm:text-xs">
                        {stageLabel}
                      </span>
                    </div>
                    <div className="mt-2.5 min-h-0 flex-1 sm:mt-4">
                      <p className="line-clamp-2 text-xs font-bold leading-snug text-text-dark sm:line-clamp-3 sm:text-sm">
                        {job.job}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-text-light sm:mt-1.5 sm:line-clamp-2 sm:text-xs">
                        {job.customer}
                      </p>
                    </div>
                    <p className="mt-2 border-t border-surface-border/40 pt-1.5 text-[10px] font-semibold text-text-light sm:mt-3 sm:pt-2 sm:text-xs">
                      Due {job.dateDue}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm font-medium text-text-light">
              No active jobs yet.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
            <div>
              <h2 className="font-bold text-text-dark">Thread Colours</h2>
              <p className="mt-1 text-xs font-medium text-text-light">
                New colours
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("thread-index")}
              className="text-sm font-bold text-accent-action transition hover:opacity-80 focus:outline-none focus:underline"
            >
              More
            </button>
          </div>

          {recentColors.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 sm:gap-3 sm:p-5">
              {recentColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => onNavigate("thread-index")}
                  className="flex items-center gap-2.5 rounded-xl border border-surface-border/70 bg-surface-main p-2.5 text-left shadow-2xs transition hover:-translate-y-0.5 hover:bg-surface-head/40 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-accent-action sm:p-3"
                >
                  <span
                    className="size-8 shrink-0 rounded-lg border border-surface-border shadow-inner"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <span className="font-mono text-xs font-bold text-text-dark sm:text-sm">
                      {color.pantone}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-text-light sm:text-xs">
                      {color.thread}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm font-medium text-text-light">
              No colours added yet.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
            <div>
              <h2 className="font-bold text-text-dark">Notes</h2>
              <p className="mt-1 text-xs font-medium text-text-light">
                Recently added notes
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("notes")}
              className="text-sm font-bold text-accent-action transition hover:opacity-80"
            >
              More
            </button>
          </div>
          {recentNotes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
              {recentNotes.map((note) => {
                const palette =
                  notePalette.find((c) => c.key === note.color) ?? notePalette[3];
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setViewingNote(note)}
                    className={`min-h-32 border p-4 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-action ${palette.cardClass}`}
                  >
                    <span className="line-clamp-2 font-bold text-text-dark">
                      {note.title}
                    </span>
                    <span className="mt-2 line-clamp-3 text-xs leading-5 text-text-dark/80">
                      {note.text}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-sm font-medium text-text-light">
              No notes yet.
            </p>
          )}
        </section>
      </div>

      {/* Read-Only View Job Modal */}
      {viewingJob && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setViewingJob(null)}
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
                  Job {viewingJob.jobNo}
                </p>
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
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {jobDraft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setJobDraft(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  Job {jobDraft.jobNo}
                </p>
                <h2 className="mt-0.5 text-xl font-bold text-text-dark">Edit job details</h2>
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

                {tags.length > 0 && (
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
                )}

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
                <button
                  type="button"
                  onClick={() => handleDeleteJob(jobDraft.id!)}
                  className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                >
                  Delete
                </button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setJobDraft(null)}
                    className="rounded-xl border border-surface-border bg-surface-main px-5 py-2.5 text-sm font-bold text-text-dark transition hover:bg-surface-head"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveJobDraft(true)}
                    className="rounded-xl bg-accent-secondary px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                  >
                    Complete
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-Only View Note Modal */}
      {viewingNote && (() => {
        const viewPalette = notePalette.find((c) => c.key === viewingNote.color) ?? notePalette[3];
        const formattedDate = new Date(viewingNote.createdAt).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
            onMouseDown={() => setViewingNote(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className={`w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl ${viewPalette.cardClass}`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-text-dark/70">
                  {formattedDate}
                </p>
                <button
                  type="button"
                  onClick={() => setViewingNote(null)}
                  aria-label="Close note"
                  className="grid size-8 place-items-center rounded-lg text-text-dark/70 transition hover:bg-black/5 hover:text-text-dark"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8">
                <h2 className="text-2xl font-bold tracking-tight text-text-dark">
                  {viewingNote.title}
                </h2>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-dark sm:text-base">
                  {viewingNote.text || <span className="italic opacity-60">No additional content.</span>}
                </div>
              </div>

              <div className="flex justify-between border-t border-black/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleDeleteNote(viewingNote.id)}
                  className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={handleEditNoteFromView}
                  className="flex items-center gap-2 rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Note Modal */}
      {noteDraft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setNoteDraft(null)}
        >
          <form
            onSubmit={handleSaveNote}
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-6 py-4 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  EDIT NOTE
                </p>
                <h2 className="mt-0.5 text-xl font-bold text-text-dark">
                  Edit your note
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNoteDraft(null)}
                aria-label="Close modal"
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <label className="form-label block">
                Title
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={noteDraft.title}
                  onChange={(e) => setNoteDraft({ ...noteDraft, title: e.target.value })}
                  className="field mt-2"
                  placeholder="Note title"
                />
                <span className="mt-1.5 block text-right text-xs font-medium text-text-light">
                  {noteDraft.title.length} / 100
                </span>
              </label>

              <label className="form-label block">
                Note
                <textarea
                  maxLength={1000}
                  rows={8}
                  value={noteDraft.text}
                  onChange={(e) => setNoteDraft({ ...noteDraft, text: e.target.value })}
                  className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3.5 text-sm leading-6 text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
                  placeholder="Write your note…"
                />
                <span className="mt-1.5 block text-right text-xs font-medium text-text-light">
                  {noteDraft.text.length} / 1000
                </span>
              </label>

              <fieldset>
                <legend className="form-label">Colour</legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {notePalette.map((color) => {
                    const selected = noteDraft.color === color.key;
                    return (
                      <button
                        key={color.key}
                        type="button"
                        onClick={() => setNoteDraft({ ...noteDraft, color: color.key })}
                        className={`flex items-center gap-2.5 rounded-xl border p-3 text-sm font-bold text-text-dark transition ${
                          selected
                            ? "border-accent-action bg-accent-action/5 ring-2 ring-accent-action"
                            : "border-surface-border hover:border-slate-400"
                        }`}
                      >
                        <span className={`size-5 rounded-md ${color.pickerClass}`} />
                        {color.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className="flex justify-between border-t border-surface-border bg-surface-head px-6 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => handleDeleteNote(noteDraft.id)}
                className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNoteDraft(null)}
                  className="rounded-xl border border-surface-border bg-surface-main px-5 py-2.5 text-sm font-bold text-text-dark hover:bg-surface-head"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}