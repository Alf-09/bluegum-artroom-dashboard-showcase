import { useState, useMemo, useEffect } from "react";
import type { FormEvent } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import type { ThreadColor } from "../types";
import { Search, ArrowUp, MoreVertical, X } from "lucide-react";

type SortKey = "pantone" | "thread";
type SortDirection = "asc" | "desc";

interface ThreadColourPageProps {
  colors: ThreadColor[];
}

export function ThreadColourPage({ colors }: ThreadColourPageProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pantone");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [colorDraft, setColorDraft] = useState<{
    id: string | null;
    pantone: string;
    thread: string;
    hex: string;
    comments: string;
  } | null>(null);

  // Close 3-dot dropdown when clicking outside
  useEffect(() => {
    function closeDropdown() {
      setActiveMenuId(null);
    }
    if (activeMenuId) {
      window.addEventListener("click", closeDropdown);
    }
    return () => window.removeEventListener("click", closeDropdown);
  }, [activeMenuId]);

  async function handleDeleteColor(id: string) {
    await deleteDoc(doc(db, "colors", id));
    setActiveMenuId(null);
    if (colorDraft?.id === id) {
      setColorDraft(null);
    }
  }

  async function handleSaveColor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!colorDraft) return;
    const form = new FormData(e.currentTarget);
    const pantone = String(form.get("pantone") ?? "").trim();
    const thread = String(form.get("thread") ?? "").trim();
    const comments = String(form.get("comments") ?? "").trim();
    const hex = String(form.get("hex") ?? colorDraft.hex);

    if (colorDraft.id === null) {
      // New Entry
      await addDoc(collection(db, "colors"), {
        name: pantone,
        pantone,
        thread,
        comments,
        hex,
      });
    } else {
      // Edit Existing Entry
      await updateDoc(doc(db, "colors", colorDraft.id), {
        name: pantone,
        pantone,
        thread,
        comments,
        hex,
      });
    }

    setColorDraft(null);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((d: SortDirection) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  }

  const visibleColors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return colors
      .filter((c) =>
        [c.pantone, c.thread, c.comments].some((v) => String(v || "").toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const aVal = a[sortKey] || "";
        const bVal = b[sortKey] || "";
        return (
          aVal.localeCompare(bVal, undefined, { numeric: true }) *
          (direction === "asc" ? 1 : -1)
        );
      });
  }, [colors, direction, query, sortKey]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">
          Thread Colour Matching
        </h1>
        <p className="mt-2 text-sm text-text-light">
          A working reference for matching physical threads with their closest Pantone values.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="group flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-surface-border bg-surface-main px-4 shadow-xs transition focus-within:border-accent-action focus-within:ring-2 focus-within:ring-accent-action/15">
          <Search className="size-5 shrink-0 text-text-light group-focus-within:text-accent-action" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find Pantone or thread"
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
        <button
          type="button"
          onClick={() =>
            setColorDraft({
              id: null,
              pantone: "",
              thread: "",
              hex: "#5773E3",
              comments: "",
            })
          }
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
        >
          Add colour
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-text-light">
          Sort by
        </span>
        {(
          [
            ["pantone", "Pantone"],
            ["thread", "Thread"],
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
                  className={`size-3 transition-transform ${
                    direction === "desc" ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
        <div className="grid grid-cols-[3fr_2fr_4fr] border-b border-surface-border bg-surface-head px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-light">
          <span>Pantone</span>
          <span>Thread</span>
          <span>Comments</span>
        </div>
        <div className="divide-y divide-surface-border/40">
          {visibleColors.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[3fr_2fr_4fr] items-center px-6 py-4 transition hover:bg-surface-head/30"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {/* 3 Stacked Dots Button & Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === c.id ? null : c.id);
                    }}
                    className="grid size-8 place-items-center rounded-lg text-text-light transition hover:bg-surface-head hover:text-text-dark focus:outline-none"
                    aria-label="Options"
                  >
                    <MoreVertical className="size-4" />
                  </button>

                  {activeMenuId === c.id && (
                    <div
                      className="absolute left-0 top-9 z-20 w-32 rounded-xl border border-surface-border bg-surface-main p-1 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setColorDraft({
                            id: c.id,
                            pantone: c.pantone,
                            thread: c.thread,
                            hex: c.hex,
                            comments: c.comments,
                          });
                          setActiveMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-text-dark transition hover:bg-surface-head"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteColor(c.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <span
                  className="size-8 shrink-0 rounded-lg border border-surface-border shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="font-mono text-sm font-bold text-text-dark">{c.pantone}</span>
              </div>
              <span className="font-mono text-sm text-text-light">{c.thread}</span>
              <span className="text-sm text-text-light">{c.comments || "—"}</span>
            </div>
          ))}
          {visibleColors.length === 0 && (
            <div className="p-8 text-center text-sm font-medium text-text-light">
              No matching colours found.
            </div>
          )}
        </div>
      </div>

      {/* Unified Add / Edit Colour Modal */}
      {colorDraft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setColorDraft(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  {colorDraft.id === null ? "New Swatch" : "Thread Swatch"}
                </p>
                <h2 className="mt-0.5 text-lg font-bold text-text-dark">
                  {colorDraft.id === null ? "New Pantone" : "Edit Pantone"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setColorDraft(null)}
                aria-label="Close dialog"
                className="grid size-8 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveColor}>
              <div className="space-y-4 p-6">
                <div>
                  <label className="form-label mb-1">Pantone</label>
                  <input
                    name="pantone"
                    required
                    defaultValue={colorDraft.pantone}
                    className="field"
                    placeholder="Pantone code"
                  />
                </div>

                <div>
                  <label className="form-label mb-1">Thread no.</label>
                  <input
                    name="thread"
                    required
                    defaultValue={colorDraft.thread}
                    className="field"
                    placeholder="Thread number"
                  />
                </div>

                <div>
                  <label className="form-label mb-1">Swatch colour</label>
                  <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-main px-3.5 text-xs font-bold text-text-dark">
                    <span>Colour</span>
                    <input
                      name="hex"
                      type="color"
                      defaultValue={colorDraft.hex}
                      className="size-7 shrink-0 cursor-pointer rounded-lg border border-surface-border p-0 bg-transparent"
                    />
                  </label>
                </div>

                <div>
                  <label className="form-label mb-1">Comments</label>
                  <textarea
                    name="comments"
                    rows={3}
                    defaultValue={colorDraft.comments}
                    className="w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3 text-sm text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
                    placeholder="Add comments..."
                  />
                </div>
              </div>

              <div className="flex justify-between gap-2 border-t border-surface-border bg-surface-head px-6 py-4">
                {colorDraft.id !== null ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteColor(colorDraft.id!)}
                    className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
                >
                  {colorDraft.id === null ? "Save" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}