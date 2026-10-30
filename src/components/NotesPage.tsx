import { useState, useMemo, useEffect } from "react";
import type { FormEvent } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Note, NoteColor } from "../types";
import { Search, X } from "lucide-react";

interface NoteDraft {
  id: string | null;
  title: string;
  text: string;
  color: NoteColor;
}

export const notePalette: {
  key: NoteColor;
  label: string;
  cardClass: string;
  pickerClass: string;
}[] = [
  { key: "green", label: "Fluoro green", cardClass: "border-note-green-border bg-note-green-bg", pickerClass: "bg-note-green-border" },
  { key: "pink", label: "Pink", cardClass: "border-note-pink-border bg-note-pink-bg", pickerClass: "bg-note-pink-border" },
  { key: "blue", label: "Blue", cardClass: "border-note-blue-border bg-note-blue-bg", pickerClass: "bg-note-blue-border" },
  { key: "yellow", label: "Yellow", cardClass: "border-note-yellow-border bg-note-yellow-bg", pickerClass: "bg-note-yellow-border" },
];

interface NotesPageProps {
  notes: Note[];
  openNoteId: string | null;
  onNoteOpened: () => void;
}

export function NotesPage({ notes, openNoteId, onNoteOpened }: NotesPageProps) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (!openNoteId) return;
    const note = notes.find((item) => item.id === openNoteId);
    if (note) openNote(note);
    onNoteOpened();
  }, [notes, onNoteOpened, openNoteId]);

  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes
      .filter((note) =>
        `${note.title} ${note.text}`.toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => Math.max(b.createdAt, b.viewedAt) - Math.max(a.createdAt, a.viewedAt));
  }, [notes, query]);

  function createNote() {
    setDraft({ id: null, title: "", text: "", color: "yellow" });
  }

  async function openNote(note: Note) {
    const viewedAt = Date.now();
    await updateDoc(doc(db, "notes", note.id), { viewedAt });
    setViewingNote(note);
  }

  async function handleDeleteFromView() {
    if (!viewingNote) return;
    await deleteDoc(doc(db, "notes", viewingNote.id));
    setViewingNote(null);
  }

  function handleEditFromView() {
    if (!viewingNote) return;
    setDraft({
      id: viewingNote.id,
      title: viewingNote.title,
      text: viewingNote.text,
      color: viewingNote.color,
    });
    setViewingNote(null);
  }

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;

    if (draft.id === null) {
      const timestamp = Date.now();
      await addDoc(collection(db, "notes"), {
        title: draft.title.trim(),
        text: draft.text.trim(),
        color: draft.color,
        createdAt: timestamp,
        viewedAt: timestamp,
      });
    } else {
      await updateDoc(doc(db, "notes", draft.id), {
        title: draft.title.trim(),
        text: draft.text.trim(),
        color: draft.color,
        viewedAt: Date.now(),
      });
    }

    setDraft(null);
  }

  async function deleteCurrentNote() {
    if (!draft || draft.id === null) return;
    await deleteDoc(doc(db, "notes", draft.id));
    setDraft(null);
  }

  return (
    <section id="notes-panel" role="tabpanel" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="mb-9">
        <h1 className="text-3xl font-bold tracking-tight text-accent-heading sm:text-4xl">Artroom Notes</h1>
        <p className="mt-2 text-sm text-text-light">
          Important information and references for the artroom
        </p>
      </div>

      {/* Search and Action Bar */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <label className="group flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-surface-border bg-surface-main px-4 shadow-xs transition focus-within:border-accent-action focus-within:ring-2 focus-within:ring-accent-action/15">
          <Search className="size-5 text-text-light group-focus-within:text-accent-action" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
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
          onClick={createNote}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-action px-6 text-sm font-bold text-white shadow-xs transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2"
        >
          New Note
        </button>
      </div>

      {/* Sticky Notes Grid */}
      {visibleNotes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-5">
          {visibleNotes.map((note) => {
            const palette = notePalette.find((c) => c.key === note.color) ?? notePalette[3];
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => openNote(note)}
                className={`flex min-h-44 w-full flex-col border p-4 text-left shadow-xs transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-action focus:ring-offset-2 sm:min-h-52 sm:p-6 ${palette.cardClass}`}
              >                <span className="line-clamp-2 text-base font-bold leading-snug text-text-dark sm:text-xl">
                  {note.title}
                </span>
                {note.text && (
                  <span className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-5 text-text-dark/90 sm:mt-3 sm:line-clamp-8 sm:text-sm sm:leading-6">
                    {note.text}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-border bg-surface-main px-6 py-16 text-center">
          <p className="font-bold text-text-dark">{query ? "No notes found" : "No notes yet"}</p>
          <p className="mt-1 text-sm text-text-light">
            {query ? "Try searching with another keyword." : "Create your first note to get started."}
          </p>
        </div>
      )}

      {/* View Note Modal (Read-Only) */}
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
                  onClick={handleDeleteFromView}
                  className="rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert transition hover:bg-stage-danger-bg"
                >
                  Delete
                </button>
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
        );
      })()}

      {/* Note Modal (Create & Edit) */}
      {draft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setDraft(null)}
        >
          <form
            onSubmit={saveNote}
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface-main shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent-action">
                  Sticky Note
                </p>
                <h2 className="mt-1 text-xl font-bold text-text-dark">
                  {draft.id === null ? "Create Note" : "Edit Note"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Close modal"
                className="grid size-9 place-items-center rounded-lg text-text-light hover:bg-surface-head hover:text-text-dark"
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
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="field mt-2"
                  placeholder="Note title"
                />
                <span className="mt-1.5 block text-right text-xs font-medium text-text-light">
                  {draft.title.length} / 100
                </span>
              </label>

              <label className="form-label block">
                Note
                <textarea
                  maxLength={1000}
                  rows={8}
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  className="mt-2 w-full resize-y rounded-xl border border-surface-border bg-surface-main p-3.5 text-sm leading-6 text-text-dark outline-none focus:border-accent-action focus:ring-2 focus:ring-accent-action/15"
                  placeholder="Write your note…"
                />
                <span className="mt-1.5 block text-right text-xs font-medium text-text-light">
                  {draft.text.length} / 1000
                </span>
              </label>

              <fieldset>
                <legend className="form-label">Colour</legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {notePalette.map((color) => {
                    const selected = draft.color === color.key;
                    return (
                      <button
                        key={color.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, color: color.key })}
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

            <div className="flex flex-col-reverse gap-2 border-t border-surface-border bg-surface-head/40 px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
              <div>
                {draft.id !== null && (
                  <button
                    type="button"
                    onClick={deleteCurrentNote}
                    className="w-full rounded-xl border border-stage-danger-border bg-surface-main px-5 py-2.5 text-sm font-bold text-accent-alert hover:bg-stage-danger-bg sm:w-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
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