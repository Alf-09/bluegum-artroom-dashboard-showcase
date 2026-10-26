import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import {
  onAuthStateChanged,
  signOut,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Login } from "./components/Login";
import { DashboardPage } from "./components/DashboardPage";
import { ThreadColourPage } from "./components/ThreadColourPage";
import { ProductionPage } from "./components/ProductionPage";
import { NotesPage } from "./components/NotesPage";
import { ArchivePage } from "./components/ArchivePage";
import type {
  ThreadColor,
  ProductionJob,
  Note,
  Tab,
} from "./types";
import {
  Menu,
  LogOut,
  X,
  KeyRound,
  UserCheck,
  LayoutDashboard,
  Palette,
  Layers,
  StickyNote,
  Archive,
} from "lucide-react";


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [colors, setColors] = useState<ThreadColor[]>([]);
  const [jobs, setJobs] = useState<ProductionJob[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<string[]>([
    "Digitizing",
    "Embroidery",
    "Offshore",
    "AM",
    "Screen Print",
    "Transfer Print",
    "Promo",
    "Local",
    "Redraw",
  ]);

  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) {
        setNewEmail(currentUser.email);
      }
      setAuthChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubColors = onSnapshot(collection(db, "colors"), (snap) => {
      setColors(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ThreadColor)));
    });

    const unsubJobs = onSnapshot(collection(db, "jobs"), (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionJob)));
    });

    const unsubNotes = onSnapshot(collection(db, "notes"), (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note)));
    });

    return () => {
      unsubColors();
      unsubJobs();
      unsubNotes();
    };
  }, [user]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Edit Login credentials modal states
  const [editLoginOpen, setEditLoginOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginModalError, setLoginModalError] = useState<string | null>(null);
  const [loginModalSuccess, setLoginModalSuccess] = useState<string | null>(null);
  const [loginModalLoading, setLoginModalLoading] = useState(false);

  function openJobFromDashboard(jobId: string) {
    setPendingJobId(jobId);
    setActiveTab("production");
  }

  function openNoteFromDashboard(noteId: string) {
    setPendingNoteId(noteId);
    setActiveTab("notes");
  }

  async function handleUpdateCredentials(e: FormEvent) {
    e.preventDefault();
    setLoginModalError(null);
    setLoginModalSuccess(null);

    if (!user || !user.email) {
      setLoginModalError("No active user session found.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setLoginModalError("New passwords do not match.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setLoginModalError("Password must be at least 6 characters.");
      return;
    }

    setLoginModalLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      if (newEmail.trim() && newEmail.trim() !== user.email) {
        await updateEmail(user, newEmail.trim());
      }

      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      setLoginModalSuccess("Login credentials updated successfully in Firebase.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setLoginModalError("Current password is incorrect.");
      } else if (err.code === "auth/email-already-in-use") {
        setLoginModalError("That email is already in use by another account.");
      } else if (err.code === "auth/requires-recent-login") {
        setLoginModalError("Please sign out and log back in before changing credentials.");
      } else {
        setLoginModalError(err.message || "Failed to update login credentials.");
      }
    } finally {
      setLoginModalLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 font-bold text-slate-400">
        Loading Art Studio...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-surface-border bg-surface-main">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
          <div className="flex items-center gap-3">
            <img
              src="/bg_icon.svg"
              alt="Bluegum Icon"
              className="size-9 shrink-0 object-contain sm:hidden"
            />

            <img
              src="/bg_full_logo.svg"
              alt="Bluegum Logo"
              className="hidden h-8 w-auto sm:block"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-xs font-bold text-text-light sm:text-sm">
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="sm:hidden">
                {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((c) => !c)}
                className="grid size-11 place-items-center rounded-xl border border-surface-border bg-surface-main text-text-dark transition hover:bg-surface-head"
                aria-label="Toggle user menu"
              >
                <Menu className="size-5" />
              </button>

            {menuOpen && (
              <div className="absolute right-0 top-14 z-20 w-64 rounded-2xl border border-surface-border bg-surface-main p-2 shadow-xl shadow-slate-900/10">
                <div className="border-b border-surface-border/50 px-3 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-light">Logged in as</p>
                  <p className="mt-0.5 truncate text-xs font-bold text-text-dark">
                    {user.email || "artroom@bluegum.com.au"}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setLoginModalError(null);
                      setLoginModalSuccess(null);
                      if (user.email) setNewEmail(user.email);
                      setEditLoginOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-text-dark transition hover:bg-surface-head"
                  >
                    <KeyRound className="size-4 text-text-light" />
                    Edit login
                  </button>
                </div>

                <div className="border-t border-surface-border/50 pt-1">
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-accent-alert transition hover:bg-red-50"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
                <div className="border-t border-surface-border/50 px-3 py-2 text-center">
                  <p className="text-[10px] font-semibold text-text-light">
                    Version 1.0.0
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Edit Login Modal */}
      {editLoginOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={() => setEditLoginOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-main shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-border bg-surface-head px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-surface-main text-accent-action shadow-xs">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-dark">Edit Studio Login</h2>
                  <p className="text-xs text-text-light">Updates account in Firebase console</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditLoginOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-text-light hover:bg-surface-main hover:text-text-dark"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCredentials}>
              <div className="p-6">
                {loginModalError && (
                  <div className="mb-4 rounded-xl border border-stage-danger-border bg-stage-danger-bg p-3 text-xs font-semibold text-accent-alert">
                    {loginModalError}
                  </div>
                )}

                {loginModalSuccess && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                    {loginModalSuccess}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="form-label mb-1 text-text-dark">Current Password (Required)</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="field text-text-dark placeholder:text-text-light"
                      placeholder="Enter current password"
                    />
                    <p className="mt-1 text-[11px] text-text-light">
                      Required by Firebase to verify team identity
                    </p>
                  </div>

                  <div className="border-t border-surface-border/50 pt-3">
                    <label className="form-label mb-1 text-text-dark">New User Login Email</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="field text-text-dark placeholder:text-text-light"
                      placeholder="artroom@bluegum.com.au"
                    />
                  </div>

                  <div>
                    <label className="form-label mb-1 text-text-dark">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="field text-text-dark placeholder:text-text-light"
                      placeholder="Leave blank to keep unchanged"
                    />
                  </div>

                  {newPassword && (
                    <div>
                      <label className="form-label mb-1 text-text-dark">Confirm New Password</label>
                      <input
                        type="password"
                        required={Boolean(newPassword)}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="field text-text-dark placeholder:text-text-light"
                        placeholder="Re-enter new password"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-surface-border bg-surface-head px-6 py-4">
                <button
                  type="button"
                  onClick={() => setEditLoginOpen(false)}
                  className="rounded-xl border border-surface-border bg-surface-main px-5 py-2.5 text-sm font-bold text-text-dark transition hover:bg-surface-head"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loginModalLoading}
                  className="rounded-xl bg-accent-action px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
                >
                  {loginModalLoading ? "Updating..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <nav className="border-b border-surface-border bg-surface-main" aria-label="Navigation">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-3 sm:px-8 lg:px-12">
          <div className="flex w-full justify-around sm:w-auto sm:justify-start sm:gap-1" role="tablist">
            {(
              [
                ["dashboard", "Dashboard", LayoutDashboard],
                ["thread-index", "Thread", Palette],
                ["production", "Production", Layers],
                ["notes", "Notes", StickyNote],
                ["archive", "Archive", Archive],
              ] as const
            ).map(([tab, label, Icon]) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={label}
                  title={label}
                  onClick={() => setActiveTab(tab)}
                  className={`relative flex items-center justify-center px-3 py-3.5 text-sm font-bold transition sm:px-4 sm:py-4 ${
                    active ? "text-accent-action" : "text-text-light hover:text-text-dark"
                  }`}
                >
                  <Icon className="size-5 sm:hidden" />
                  <span className="hidden sm:inline">{label}</span>
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-action sm:inset-x-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Pages Switcher */}
      {activeTab === "dashboard" && (
        <DashboardPage
          colors={colors}
          jobs={jobs}
          notes={notes}
          onNavigate={setActiveTab}
          onOpenJob={openJobFromDashboard}
          onOpenNote={openNoteFromDashboard}
        />
      )}

      {activeTab === "thread-index" && (
        <ThreadColourPage colors={colors} />
      )}

      {activeTab === "production" && (
        <ProductionPage
          jobs={jobs}
          tags={tags}
          setTags={setTags}
          openJobId={pendingJobId}
          onJobOpened={() => setPendingJobId(null)}
        />
      )}

      {activeTab === "notes" && (
        <NotesPage
          notes={notes}
          openNoteId={pendingNoteId}
          onNoteOpened={() => setPendingNoteId(null)}
        />
      )}

      {activeTab === "archive" && (
        <ArchivePage jobs={jobs} />
      )}

    </main>
  );
}