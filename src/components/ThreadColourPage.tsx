import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ThreadColor } from "../types";
import { Search, Plus, ArrowUp } from "lucide-react";

type SortKey = "name" | "pantone" | "thread";
type SortDirection = "asc" | "desc";

interface ThreadColourPageProps {
  colors: ThreadColor[];
}

export function ThreadColourPage({ colors }: ThreadColourPageProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [addingColor, setAddingColor] = useState(false);

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
        [c.name, c.pantone, c.thread].some((v) => v.toLowerCase().includes(q))
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

  async function addColor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addDoc(collection(db, "colors"), {
      name: String(form.get("name") ?? "").trim(),
      pantone: String(form.get("pantone") ?? "").trim(),
      thread: String(form.get("thread") ?? "").trim(),
      comments: String(form.get("comments") ?? "").trim(),
      hex: String(form.get("hex") ?? "#5b70d6"),
    });
    setAddingColor(false);
    e.currentTarget.reset();
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">
          Thread Colour Index
        </h1>
        <p className="mt-2 text-sm text-text-light">
          A working reference for matching physical threads with their closest Pantone values
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="group flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-surface-border bg-surface-main px-4 shadow-xs transition focus-within:border-accent-action focus-within:ring-2 focus-within:ring-accent-action/15">
          <Search className="size-5 shrink-0 text-text-light group-focus-within:text-accent-action" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find colour, Pantone or thread…"
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
          onClick={() => setAddingColor((c) => !c)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
        >
          <Plus className="size-4" />
          {addingColor ? "Hide fields" : "Add colour"}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-text-light">
          Sort by
        </span>
        {(
          [
            ["name", "Colour"],
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

      {addingColor && (
        <form
          onSubmit={addColor}
          className="mb-6 grid gap-3 rounded-2xl border border-surface-border bg-surface-main p-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <input name="name" required placeholder="Colour name" className="field" />
          <input name="pantone" required placeholder="Pantone" className="field" />
          <input name="thread" required placeholder="Thread no." className="field" />
          <input name="comments" placeholder="Comments" className="field" />
          <input
            name="hex"
            type="color"
            defaultValue="#5773E3"
            className="field h-11 p-1 cursor-pointer"
          />
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90"
          >
            Save
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-xs">
        <div className="grid grid-cols-[4fr_3fr_6fr] border-b border-surface-border bg-surface-head px-6 py-3 text-xs font-bold uppercase tracking-wider text-text-light">
          <span>Pantone</span>
          <span>Thread</span>
          <span>Comments</span>
        </div>
        <div className="divide-y divide-surface-border/40">
          {visibleColors.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[4fr_3fr_6fr] items-center px-6 py-4 transition hover:bg-surface-head/30"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-lg border border-surface-border shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="font-mono text-sm font-bold text-text-light">{c.pantone}</span>
              </div>
              <span className="font-mono text-sm font-bold text-text-light">{c.thread}</span>
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
    </section>
  );
}