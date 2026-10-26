import type { ThreadColor, ProductionJob, Note, Tab } from "../types";
import { productionStages, effectiveStage } from "./ProductionPage";
import { notePalette } from "./NotesPage";

interface DashboardPageProps {
  colors: ThreadColor[];
  jobs: ProductionJob[];
  notes: Note[];
  onNavigate: (tab: Tab) => void;
  onOpenJob: (jobId: string) => void;
  onOpenNote: (noteId: string) => void;
}

export function DashboardPage({
  colors,
  jobs,
  notes,
  onNavigate,
  onOpenJob,
  onOpenNote,
}: DashboardPageProps) {
  const currentDate = new Date();
  const urgentJobs = [...jobs]
    .filter((job) => !job.archived)
    .sort((a, b) => a.statusSince - b.statusSince)
    .slice(0, 5);
  const recentColors = [...colors].slice(-5).reverse();
  const recentNotes = [...notes]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-text-light">
          Quick overview of the artroom's current production, thread colours, and notes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs sm:col-span-2">
          <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-5 py-4 sm:px-7">
            <div>
              <h2 className="font-bold text-text-dark">Danger Zone Jobs</h2>
              <p className="mt-1 text-xs font-medium text-text-light">
                Priority jobs that need attention
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
                    onClick={() => onOpenJob(job.id)}
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
              <h2 className="font-bold text-text-dark">Recent colours</h2>
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
                    onClick={() => onOpenNote(note.id)}
                    className={`min-h-32 border p-4 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md ${palette.cardClass}`}
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
    </section>
  );
}