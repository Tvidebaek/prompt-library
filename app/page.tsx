"use client";

import {
  Check,
  Copy,
  Download,
  FilePlus2,
  FolderPlus,
  Layers3,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  categories,
  defaultFolders,
  defaultPrompts,
  Folder,
  Prompt,
  PromptStatus
} from "../lib/prompt-data";

const STORAGE_KEY = "prompt-library-state-v1";
const BACKUP_SCHEMA = "prompt-library.backup";
const BACKUP_VERSION = 1;
const ALL_FOLDERS = "all";
const NO_FOLDER = "uncategorized";

type LibraryState = {
  folders: Folder[];
  prompts: Prompt[];
};

type LibraryBackup = {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  library: LibraryState;
};

type DraftPrompt = {
  title: string;
  content: string;
  folderId: string;
  category: string;
  tags: string;
};

type OptimizationDraft = {
  promptId: string;
  content: string;
  notes: string[];
};

const emptyDraft: DraftPrompt = {
  title: "",
  content: "",
  folderId: defaultFolders[0].id,
  category: categories[0],
  tags: ""
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFolder(value: unknown): value is Folder {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string"
  );
}

function isPrompt(value: unknown): value is Prompt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.folderId === "string" &&
    typeof value.category === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    (value.status === "draft" || value.status === "optimized") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.optimizedContent === undefined ||
      typeof value.optimizedContent === "string") &&
    (value.optimizationNotes === undefined ||
      (Array.isArray(value.optimizationNotes) &&
        value.optimizationNotes.every((note) => typeof note === "string")))
  );
}

function isLibraryState(value: unknown): value is LibraryState {
  return (
    isRecord(value) &&
    Array.isArray(value.folders) &&
    Array.isArray(value.prompts) &&
    value.folders.every(isFolder) &&
    value.prompts.every(isPrompt)
  );
}

function parseBackup(value: unknown): LibraryState | null {
  if (
    !isRecord(value) ||
    value.schema !== BACKUP_SCHEMA ||
    value.version !== BACKUP_VERSION ||
    typeof value.exportedAt !== "string" ||
    !isLibraryState(value.library)
  ) {
    return null;
  }

  return value.library;
}

function readStoredLibrary(): LibraryState {
  if (typeof window === "undefined") {
    return {
      folders: defaultFolders,
      prompts: defaultPrompts
    };
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return {
      folders: defaultFolders,
      prompts: defaultPrompts
    };
  }

  try {
    return JSON.parse(saved) as LibraryState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {
      folders: defaultFolders,
      prompts: defaultPrompts
    };
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function tagList(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildOptimization(prompt: Prompt): OptimizationDraft {
  const hasRole = /act as|you are/i.test(prompt.content);
  const hasFormat = /return|include|format/i.test(prompt.content);
  const hasCriteria = /criteria|evaluate|review|analyze|check/i.test(
    prompt.content
  );
  const notes = [
    hasRole ? "Kept the existing role framing." : "Added a specific expert role.",
    hasCriteria
      ? "Preserved the evaluation criteria."
      : "Added explicit quality criteria.",
    hasFormat
      ? "Sharpened the requested output format."
      : "Added a structured response format."
  ];

  const content = [
    hasRole ? prompt.content : `Act as a senior ${prompt.category.toLowerCase()} partner. ${prompt.content}`,
    "",
    "Before answering, identify the user's likely goal and any missing context.",
    "Return the response in this structure:",
    "1. Best answer or output",
    "2. Assumptions made",
    "3. Risks, edge cases, or tradeoffs",
    "4. Suggested next step"
  ].join("\n");

  return {
    promptId: prompt.id,
    content,
    notes
  };
}

export default function Home() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [library, setLibrary] = useState<LibraryState>(readStoredLibrary);
  const [selectedId, setSelectedId] = useState(
    () => readStoredLibrary().prompts[0]?.id ?? ""
  );
  const [folderFilter, setFolderFilter] = useState(ALL_FOLDERS);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PromptStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPrompt>(emptyDraft);
  const [folderName, setFolderName] = useState("");
  const [optimization, setOptimization] = useState<OptimizationDraft | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [backupMessage, setBackupMessage] = useState(
    "Saved in this browser. Export a backup when you add prompts you care about."
  );
  const [backupError, setBackupError] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  const availableTags = useMemo(
    () => Array.from(new Set(library.prompts.flatMap((prompt) => prompt.tags))).sort(),
    [library.prompts]
  );

  const selectedPrompt = useMemo(
    () => library.prompts.find((prompt) => prompt.id === selectedId) ?? null,
    [library.prompts, selectedId]
  );

  const filteredPrompts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return library.prompts.filter((prompt) => {
      const matchesFolder =
        folderFilter === ALL_FOLDERS ||
        (folderFilter === NO_FOLDER && !prompt.folderId) ||
        prompt.folderId === folderFilter;
      const matchesCategory =
        categoryFilter === "all" || prompt.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || prompt.status === statusFilter;
      const searchable = [
        prompt.title,
        prompt.content,
        prompt.category,
        prompt.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesFolder &&
        matchesCategory &&
        matchesStatus &&
        (!query || searchable.includes(query))
      );
    });
  }, [categoryFilter, folderFilter, library.prompts, searchTerm, statusFilter]);

  const folderCounts = useMemo(() => {
    return library.folders.reduce<Record<string, number>>((counts, folder) => {
      counts[folder.id] = library.prompts.filter(
        (prompt) => prompt.folderId === folder.id
      ).length;
      return counts;
    }, {});
  }, [library.folders, library.prompts]);

  function resetDraft() {
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      folderId: library.folders[0]?.id ?? ""
    });
  }

  function editPrompt(prompt: Prompt) {
    setEditingId(prompt.id);
    setDraft({
      title: prompt.title,
      content: prompt.content,
      folderId: prompt.folderId,
      category: prompt.category,
      tags: prompt.tags.join(", ")
    });
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();
    const cleanDraft = {
      title: draft.title.trim() || "Untitled prompt",
      content: draft.content.trim(),
      folderId: draft.folderId,
      category: draft.category,
      tags: tagList(draft.tags)
    };

    if (!cleanDraft.content) {
      return;
    }

    if (editingId) {
      setLibrary((current) => ({
        ...current,
        prompts: current.prompts.map((prompt) =>
          prompt.id === editingId
            ? {
                ...prompt,
                ...cleanDraft,
                updatedAt: now
              }
            : prompt
        )
      }));
      setSelectedId(editingId);
      resetDraft();
      return;
    }

    const prompt: Prompt = {
      id: createId("prompt"),
      ...cleanDraft,
      status: "draft",
      createdAt: now,
      updatedAt: now
    };

    setLibrary((current) => ({
      ...current,
      prompts: [prompt, ...current.prompts]
    }));
    setSelectedId(prompt.id);
    resetDraft();
  }

  function duplicatePrompt(prompt: Prompt) {
    const now = new Date().toISOString();
    const copy: Prompt = {
      ...prompt,
      id: createId("prompt"),
      title: `${prompt.title} copy`,
      status: "draft",
      createdAt: now,
      updatedAt: now
    };

    setLibrary((current) => ({
      ...current,
      prompts: [copy, ...current.prompts]
    }));
    setSelectedId(copy.id);
    editPrompt(copy);
  }

  function deletePrompt(promptId: string) {
    setLibrary((current) => {
      const remaining = current.prompts.filter((prompt) => prompt.id !== promptId);
      return {
        ...current,
        prompts: remaining
      };
    });

    if (selectedId === promptId) {
      const nextPrompt = library.prompts.find((prompt) => prompt.id !== promptId);
      setSelectedId(nextPrompt?.id ?? "");
    }
    if (editingId === promptId) {
      resetDraft();
    }
  }

  function addFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) {
      return;
    }

    const colors = ["#2f7d6d", "#4059ad", "#bb5a3a", "#8a6f2a", "#5b6c74"];
    setLibrary((current) => ({
      ...current,
      folders: [
        ...current.folders,
        {
          id: createId("folder"),
          name,
          color: colors[current.folders.length % colors.length]
        }
      ]
    }));
    setFolderName("");
  }

  async function copyPrompt(prompt: Prompt) {
    const text = prompt.optimizedContent || prompt.content;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const backup: LibraryBackup = {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      exportedAt,
      library
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = exportedAt.slice(0, 10);

    link.href = url;
    link.download = `prompt-library-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupError("");
    setBackupMessage(`Backup exported on ${formatDate(exportedAt)}.`);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const nextLibrary = parseBackup(parsed);

      if (!nextLibrary) {
        setBackupError("That file is not a valid Prompt Library backup.");
        return;
      }

      const shouldReplace =
        typeof window.confirm === "function"
          ? window.confirm(
              "Importing this backup will replace the prompts currently saved in this browser. Continue?"
            )
          : true;

      if (!shouldReplace) {
        return;
      }

      setLibrary(nextLibrary);
      setSelectedId(nextLibrary.prompts[0]?.id ?? "");
      setEditingId(null);
      setFolderFilter(ALL_FOLDERS);
      setCategoryFilter("all");
      setStatusFilter("all");
      setSearchTerm("");
      setBackupError("");
      setBackupMessage(
        `Imported ${nextLibrary.prompts.length} prompts from ${file.name}.`
      );
    } catch {
      setBackupError("Could not read that backup file.");
    }
  }

  function acceptOptimization() {
    if (!optimization) {
      return;
    }

    const now = new Date().toISOString();
    setLibrary((current) => ({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === optimization.promptId
          ? {
              ...prompt,
              status: "optimized",
              optimizedContent: optimization.content,
              optimizationNotes: optimization.notes,
              updatedAt: now
            }
          : prompt
      )
    }));
    setOptimization(null);
  }

  const activeFilters =
    folderFilter !== ALL_FOLDERS ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim().length > 0;

  return (
    <main className="shell">
      <section className="topbar" aria-label="Library overview">
        <div>
          <p className="eyebrow">Prompt Library</p>
          <h1>Save the prompts worth reusing.</h1>
        </div>
        <div className="metric-row" aria-label="Library metrics">
          <div>
            <strong>{library.prompts.length}</strong>
            <span>Prompts</span>
          </div>
          <div>
            <strong>{library.folders.length}</strong>
            <span>Folders</span>
          </div>
          <div>
            <strong>{availableTags.length}</strong>
            <span>Tags</span>
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar" aria-label="Folders and filters">
          <form className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Search prompts"
              placeholder="Search prompts"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </form>

          <div className="panel backup-panel">
            <div className="panel-heading">
              <h2>Backup</h2>
              <ShieldCheck size={18} aria-hidden="true" />
            </div>
            <p className="storage-note">
              Your prompts live in this browser. Export a backup file to keep
              them safe outside this site.
            </p>
            <div className="button-grid">
              <button className="secondary" type="button" onClick={exportBackup}>
                <Download size={17} />
                Export
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                <Upload size={17} />
                Import
              </button>
            </div>
            <input
              ref={importInputRef}
              className="file-input"
              type="file"
              accept="application/json,.json"
              aria-label="Import prompt library backup"
              onChange={importBackup}
            />
            <p className={backupError ? "backup-message error" : "backup-message"}>
              {backupError || backupMessage}
            </p>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Folders</h2>
              <Layers3 size={18} aria-hidden="true" />
            </div>
            <button
              className={folderFilter === ALL_FOLDERS ? "folder active" : "folder"}
              type="button"
              onClick={() => setFolderFilter(ALL_FOLDERS)}
            >
              <span>All prompts</span>
              <strong>{library.prompts.length}</strong>
            </button>
            {library.folders.map((folder) => (
              <button
                className={folderFilter === folder.id ? "folder active" : "folder"}
                type="button"
                key={folder.id}
                onClick={() => setFolderFilter(folder.id)}
              >
                <span>
                  <i style={{ backgroundColor: folder.color }} />
                  {folder.name}
                </span>
                <strong>{folderCounts[folder.id] ?? 0}</strong>
              </button>
            ))}
            <form className="inline-form" onSubmit={addFolder}>
              <input
                aria-label="New folder name"
                placeholder="New folder"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
              />
              <button type="submit" aria-label="Add folder">
                <FolderPlus size={17} />
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <h2>Filters</h2>
            </div>
            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | PromptStatus)
                }
              >
                <option value="all">Any status</option>
                <option value="draft">Draft</option>
                <option value="optimized">Optimized</option>
              </select>
            </label>
            {activeFilters && (
              <button
                className="secondary wide"
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFolderFilter(ALL_FOLDERS);
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </aside>

        <section className="prompt-list" aria-label="Saved prompts">
          <div className="section-title">
            <h2>Saved prompts</h2>
            <span>{filteredPrompts.length} shown</span>
          </div>
          {filteredPrompts.length === 0 ? (
            <div className="empty-state">
              <Search size={28} aria-hidden="true" />
              <h3>No prompts found</h3>
              <p>Adjust the filters or save a new prompt for this area.</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <button
                className={selectedId === prompt.id ? "prompt-card active" : "prompt-card"}
                key={prompt.id}
                type="button"
                onClick={() => setSelectedId(prompt.id)}
              >
                <span className="card-topline">
                  <strong>{prompt.title}</strong>
                  <em>{prompt.status}</em>
                </span>
                <span>{prompt.content}</span>
                <small>
                  {prompt.category} · {prompt.tags.slice(0, 2).join(", ")}
                </small>
              </button>
            ))
          )}
        </section>

        <section className="detail" aria-label="Prompt detail and editor">
          {selectedPrompt ? (
            <>
              <div className="detail-header">
                <div>
                  <p className="eyebrow">{selectedPrompt.category}</p>
                  <h2>{selectedPrompt.title}</h2>
                  <span>Updated {formatDate(selectedPrompt.updatedAt)}</span>
                </div>
                <div className="action-row">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Copy prompt"
                    title="Copy prompt"
                    onClick={() => copyPrompt(selectedPrompt)}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Edit prompt"
                    title="Edit prompt"
                    onClick={() => editPrompt(selectedPrompt)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Duplicate prompt"
                    title="Duplicate prompt"
                    onClick={() => duplicatePrompt(selectedPrompt)}
                  >
                    <FilePlus2 size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    aria-label="Delete prompt"
                    title="Delete prompt"
                    onClick={() => deletePrompt(selectedPrompt.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="prompt-body">
                <h3>Prompt</h3>
                <p>{selectedPrompt.content}</p>
              </div>

              {selectedPrompt.optimizedContent && (
                <div className="optimized-body">
                  <h3>Optimized version</h3>
                  <p>{selectedPrompt.optimizedContent}</p>
                </div>
              )}

              <div className="tag-row">
                {selectedPrompt.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              {selectedPrompt.optimizationNotes && (
                <ul className="notes-list">
                  {selectedPrompt.optimizationNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}

              <button
                className="primary wide"
                type="button"
                onClick={() => setOptimization(buildOptimization(selectedPrompt))}
              >
                <Sparkles size={18} />
                Optimize prompt
              </button>
            </>
          ) : (
            <div className="empty-state">
              <FilePlus2 size={30} aria-hidden="true" />
              <h3>No prompt selected</h3>
              <p>Create a prompt or choose one from the library.</p>
            </div>
          )}

          <form className="editor" onSubmit={submitPrompt}>
            <div className="section-title">
              <h2>{editingId ? "Edit prompt" : "New prompt"}</h2>
              {editingId && (
                <button className="text-button" type="button" onClick={resetDraft}>
                  Cancel
                </button>
              )}
            </div>
            <label>
              Title
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Name this prompt"
              />
            </label>
            <label>
              Prompt
              <textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Paste or write the reusable prompt"
              />
            </label>
            <div className="form-grid">
              <label>
                Folder
                <select
                  value={draft.folderId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      folderId: event.target.value
                    }))
                  }
                >
                  {library.folders.map((folder) => (
                    <option value={folder.id} key={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      category: event.target.value
                    }))
                  }
                >
                  {categories.map((category) => (
                    <option value={category} key={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Tags
              <input
                value={draft.tags}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="research, editing, launch"
              />
            </label>
            <button className="primary wide" type="submit">
              <FilePlus2 size={18} />
              {editingId ? "Save changes" : "Save prompt"}
            </button>
          </form>
        </section>
      </section>

      {optimization && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true">
            <div className="section-title">
              <h2>Optimization draft</h2>
              <button
                className="text-button"
                type="button"
                onClick={() => setOptimization(null)}
              >
                Close
              </button>
            </div>
            <textarea
              aria-label="Optimized prompt draft"
              value={optimization.content}
              onChange={(event) =>
                setOptimization((current) =>
                  current ? { ...current, content: event.target.value } : current
                )
              }
            />
            <ul className="notes-list">
              {optimization.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <div className="action-row">
              <button className="secondary" type="button" onClick={() => setOptimization(null)}>
                Discard
              </button>
              <button className="primary" type="button" onClick={acceptOptimization}>
                <Check size={18} />
                Save optimized
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
