"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  DownloadSimple,
  MagnifyingGlass,
  SpinnerGap,
  ChatCircleDots,
  CheckCircle,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ScopeMeter } from "@/components/wizard/ScopeMeter";
import { buildCursorInstruction, downloadBlueprintZip } from "@/lib/artifacts/zip";
import { enrichBlueprint, getMissingDocumentKeys } from "@/lib/artifacts/render";
import { stripDangerousMarkdown } from "@/lib/security/sanitize";
import type { DocumentKey, ProjectBlueprint, SpecDocument } from "@/lib/schema";
import { getProject, saveProject } from "@/lib/store/projects";
import { createId } from "@/lib/utils";

type DesignSuggestion = {
  id: string;
  label: string;
  summary: string;
  accent: string;
  recommended: boolean;
};

async function fetchDesignSuggestions(bp: ProjectBlueprint): Promise<DesignSuggestion[]> {
  const res = await fetch("/api/visual-design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "suggest",
      blueprintJson: JSON.stringify(bp),
      originalityMode: bp.visual?.originalityMode ?? "Inspired",
    }),
  });
  const data = await res.json();
  if (!res.ok || !Array.isArray(data.suggestions)) return [];
  return data.suggestions;
}

export function WorkspaceApp({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState<DocumentKey>("01_PRD");
  const [tab, setTab] = useState<"overview" | "docs" | "visual" | "export">("overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visualInstruction, setVisualInstruction] = useState("");
  const [visualUrl, setVisualUrl] = useState("");
  const [visualMode, setVisualMode] = useState<"Reference" | "Inspired" | "Distinct">(
    "Inspired",
  );
  const [suggestions, setSuggestions] = useState<DesignSuggestion[]>([]);
  const projectRef = useRef<ProjectBlueprint | null>(null);
  const activeProjectIdRef = useRef(projectId);
  const saveChainRef = useRef(Promise.resolve());

  const isActiveProject = useCallback(
    (id: string) => activeProjectIdRef.current === id,
    [],
  );

  const persist = useCallback(async (next: ProjectBlueprint) => {
    const previous = projectRef.current;
    const activeForSave = isActiveProject(next.id);

    if (activeForSave) {
      projectRef.current = next;
      setProject(next);
    }

    const run = saveChainRef.current.then(async () => {
      try {
        const saved = await saveProject(next);
        if (activeForSave && projectRef.current === next && isActiveProject(next.id)) {
          projectRef.current = saved;
          setProject(saved);
        }
      } catch (err) {
        if (
          activeForSave &&
          previous != null &&
          projectRef.current === next &&
          isActiveProject(next.id)
        ) {
          projectRef.current = previous;
          setProject(previous);
        }
        throw err;
      }
    });

    saveChainRef.current = run.catch(() => {});
    return run;
  }, [isActiveProject]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    activeProjectIdRef.current = projectId;
    setSuggestions([]);
    setError(null);
    setBusy(false);
    setLoading(true);
    setProject(null);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const saved = await getProject(projectId);
        if (cancelled) return;
        if (!saved) {
          setError("Project not found in local storage. Generate it again from the home wizard.");
          setLoading(false);
          return;
        }
        const missingDocKeys = getMissingDocumentKeys(saved.documents);
        const needsEnrich =
          !saved.documents.length ||
          !saved.artifacts?.length ||
          missingDocKeys.length > 0;
        const enriched = needsEnrich
          ? enrichBlueprint(
              saved,
              missingDocKeys.length > 0 && saved.documents.length > 0
                ? { regenerateDocumentKeys: missingDocKeys }
                : undefined,
            )
          : saved;
        if (cancelled) return;
        setVisualMode(enriched.visual?.originalityMode ?? "Inspired");
        setVisualUrl(enriched.referenceUrl ?? "");
        if (needsEnrich) {
          try {
            await persist(enriched);
          } catch (err) {
            if (!cancelled) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to save enriched project to local storage.",
              );
            }
            return;
          }
        } else {
          setProject(enriched);
        }
        if (cancelled) return;
        try {
          const loadedSuggestions = await fetchDesignSuggestions(enriched);
          if (!cancelled && isActiveProject(enriched.id)) {
            setSuggestions(loadedSuggestions);
          }
        } catch {
          // Non-blocking: workspace still works without suggestion cards.
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load project.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActiveProject, persist, projectId]);

  const docs = useMemo(() => {
    if (!project) return [];
    return project.documents.filter((doc) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q)
      );
    });
  }, [project, query]);

  const activeDoc = project?.documents.find((d) => d.key === activeKey) ?? docs[0];

  async function applyVisualUpdate(action: "suggest" | "apply-suggestion" | "revise" | "from-url", extra?: {
    presetId?: string;
    instruction?: string;
    url?: string;
  }) {
    const current = projectRef.current;
    if (!current) return;
    const opProjectId = current.id;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/visual-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          blueprintJson: JSON.stringify(current),
          originalityMode: visualMode,
          presetId: extra?.presetId,
          instruction: extra?.instruction,
          url: extra?.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Visual design update failed.");
      if (!isActiveProject(opProjectId)) return;

      if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);

      const latest = projectRef.current ?? current;
      if (latest.id !== opProjectId) return;
      const next = enrichBlueprint(
        {
          ...latest,
          visual: data.visual,
          referenceUrl: data.url || (action === "from-url" ? extra?.url : latest.referenceUrl),
          updatedAt: new Date().toISOString(),
        },
        {
          regenerateDocumentKeys: ["02_DESIGN_SYSTEM", "10_DESIGN_ADAPTATION_GUIDE"],
        },
      );
      await persist(next);
      if (action === "revise") setVisualInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visual design update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runValidate() {
    const current = projectRef.current;
    if (!current) return;
    const opProjectId = current.id;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintJson: JSON.stringify(current) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed.");
      if (!isActiveProject(opProjectId)) return;
      const latest = projectRef.current ?? current;
      if (latest.id !== opProjectId) return;
      await persist({ ...latest, coherence: data, updatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refineActive() {
    const current = projectRef.current;
    if (!current || !activeDoc || !chatInput.trim()) return;
    const opProjectId = current.id;
    const opDocKey = activeDoc.key;
    const opDocContent = activeDoc.content;
    const opDocFileName = activeDoc.fileName;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: current.id,
          fileName: activeDoc.fileName,
          currentContent: activeDoc.content,
          userQuery: chatInput,
          blueprintJson: JSON.stringify(current),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refine failed.");
      if (!isActiveProject(opProjectId)) return;

      const latest = projectRef.current ?? current;
      if (latest.id !== opProjectId) return;
      const updatedDocs = latest.documents.map((doc) =>
        doc.key === opDocKey
          ? {
              ...doc,
              content: data.updatedContent,
              updatedAt: new Date().toISOString(),
              isDetailed: true,
            }
          : doc,
      );
      const refinedDoc = latest.documents.find((doc) => doc.key === opDocKey);
      const version = {
        id: data.versionId || createId("ver"),
        documentKey: opDocKey,
        content: opDocContent,
        summary: data.summaryOfChanges,
        createdAt: new Date().toISOString(),
      };
      const next = enrichBlueprint({
        ...latest,
        documents: updatedDocs,
        versions: [version, ...latest.versions],
        chat: [
          ...latest.chat,
          {
            id: createId("msg"),
            role: "user",
            text: chatInput,
            targetFile: opDocFileName,
            createdAt: new Date().toISOString(),
          },
          {
            id: createId("msg"),
            role: "assistant",
            text: data.summaryOfChanges,
            targetFile: opDocFileName,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await persist(next);
      setChatInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refine failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreVersion(versionId: string) {
    const current = projectRef.current;
    if (!current) return;
    const opProjectId = current.id;
    const version = current.versions.find((v) => v.id === versionId);
    if (!version) return;
    setBusy(true);
    setError(null);
    try {
      if (!isActiveProject(opProjectId)) return;
      const updatedDocs = current.documents.map((doc) =>
        doc.key === version.documentKey
          ? {
              ...doc,
              content: version.content,
              updatedAt: new Date().toISOString(),
              isDetailed: true,
            }
          : doc,
      );
      await persist(enrichBlueprint({ ...current, documents: updatedDocs }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-[var(--text-muted)]">
          <SpinnerGap className="mr-2 inline animate-spin" /> Loading workspace...
        </Card>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <Card className="p-8 text-sm text-[var(--danger)]">
          {error || "Project unavailable."}
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone="accent">{project.provider} provider</Badge>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {project.decisions.productName}
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">{project.decisions.oneLiner}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void runValidate()} disabled={busy}>
            Re-check coherence
          </Button>
          <Button onClick={() => void downloadBlueprintZip(project)} disabled={busy}>
            <DownloadSimple /> Download ZIP
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[var(--danger)]">
          {error}
        </Card>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["docs", "11 Documents"],
            ["visual", "Visual tokens"],
            ["export", "Cursor handoff"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              tab === id
                ? "bg-[var(--surface-soft)] text-[#1565C0]"
                : "bg-[#F3F4F6] text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <ScopeMeter scope={project.scope} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4">
              <h3 className="font-semibold">Screens</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {project.screens.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium text-[var(--text)]">{s.name}</span> - {s.purpose}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold">Entities</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {project.entities.map((e) => (
                  <li key={e.name}>
                    <span className="font-medium text-[var(--text)]">{e.name}</span>:{" "}
                    {e.fields.join(", ")}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold">Coherence</h3>
              {project.coherence ? (
                <div className="mt-3 space-y-2 text-sm">
                  <Badge
                    tone={
                      project.coherence.status === "Pristine"
                        ? "success"
                        : project.coherence.status === "Minor Warnings"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {project.coherence.status} · {project.coherence.score}/100
                  </Badge>
                  <p className="text-[var(--text-muted)]">
                    Internal consistency check only. Not a claim of factual correctness.
                  </p>
                  <ul className="space-y-1 text-[var(--text-secondary)]">
                    {project.coherence.issues.slice(0, 5).map((issue) => (
                      <li key={issue.id}>
                        [{issue.severity}] {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  Run coherence check to inspect cross-document consistency.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "docs" && (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card className="p-3">
            <div className="relative mb-3">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                className="pl-9"
                placeholder="Search docs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[70vh] space-y-1 overflow-auto">
              {docs.map((doc) => (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => setActiveKey(doc.key)}
                  className={`block w-full rounded-[12px] px-3 py-2 text-left text-sm ${
                    activeDoc?.key === doc.key
                      ? "bg-[var(--surface-soft)] text-[#1565C0]"
                      : "hover:bg-[#F9FAFB]"
                  }`}
                >
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{doc.fileName}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            {activeDoc ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{activeDoc.title}</h2>
                    <p className="text-xs text-[var(--text-muted)]">{activeDoc.fileName}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setChatOpen((v) => !v)}>
                      <ChatCircleDots /> Refine
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(activeDoc.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      }}
                    >
                      {copied ? <CheckCircle /> : <Copy />} Copy
                    </Button>
                  </div>
                </div>
                <article className="markdown-body max-w-none space-y-3 text-sm leading-relaxed text-[var(--text-secondary)] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[var(--text)] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[var(--text)] [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-[var(--text)] [&_code]:rounded [&_code]:bg-[#F3F4F6] [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-[14px] [&_pre]:bg-[#0F172A] [&_pre]:p-4 [&_pre]:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {stripDangerousMarkdown(activeDoc.content)}
                  </ReactMarkdown>
                </article>

                {chatOpen && (
                  <div className="mt-6 border-t border-[var(--border)] pt-4">
                    <h3 className="font-semibold">Refine this document</h3>
                    <Textarea
                      className="mt-2 min-h-24"
                      placeholder='Example: "Add webhook endpoint assumptions to backend section"'
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => void refineActive()} disabled={busy}>
                        {busy ? <SpinnerGap className="animate-spin" /> : null}
                        Apply refinement
                      </Button>
                    </div>
                    {project.versions.filter((v) => v.documentKey === activeDoc.key).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Local version history
                        </p>
                        <ul className="mt-2 space-y-2">
                          {project.versions
                            .filter((v) => v.documentKey === activeDoc.key)
                            .slice(0, 5)
                            .map((version) => (
                              <li
                                key={version.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[var(--border)] px-3 py-2 text-sm"
                              >
                                <span>{version.summary}</span>
                                <Button
                                  variant="ghost"
                                  onClick={() => void restoreVersion(version.id)}
                                  disabled={busy}
                                >
                                  Restore
                                </Button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No document selected.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "visual" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Visual Design Studio</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Revisi arah visual, ambil referensi web, atau pakai saran yang cocok untuk{" "}
                  {project.decisions.productName}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["Reference", "Inspired", "Distinct"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVisualMode(mode)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      visualMode === mode
                        ? "bg-[var(--surface-soft)] text-[#1565C0]"
                        : "bg-[#F3F4F6] text-[var(--text-secondary)]"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {project.visual?.summary || "No visual analysis yet."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="accent">{project.visual?.originalityMode || visualMode}</Badge>
              {project.hasScreenshot && <Badge>Screenshot attached</Badge>}
              {project.referenceUrl && <Badge>URL reference</Badge>}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold">Saran cocok untuk aplikasi ini</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                SpekDulu merekomendasikan arah visual berdasarkan ide, user, dan fitur Build Now.
              </p>
              <div className="mt-4 space-y-3">
                {(suggestions.length
                  ? suggestions
                  : [
                      {
                        id: "trust-blue",
                        label: "Trust Blue Workspace",
                        summary: "Calm productivity workspace for owner/ops tools.",
                        accent: "#2196F3",
                        recommended: true,
                      },
                    ]
                ).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-[16px] border border-[var(--border)] p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--border)]"
                          style={{ background: item.accent }}
                        />
                        <p className="text-sm font-semibold">{item.label}</p>
                        {item.recommended && <Badge tone="accent">Recommended</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.summary}</p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void applyVisualUpdate("apply-suggestion", { presetId: item.id })
                      }
                    >
                      Apply
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Button
                  disabled={busy}
                  onClick={() => void applyVisualUpdate("suggest")}
                >
                  {busy ? <SpinnerGap className="animate-spin" /> : null}
                  Generate best-fit suggestion
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">Ambil dari web reference</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Tempel URL publik. SpekDulu ambil hint warna lalu adaptasi ke sistem desain produkmu
                (bukan copy brand).
              </p>
              <div className="mt-4 space-y-3">
                <Input
                  value={visualUrl}
                  onChange={(e) => setVisualUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <Button
                  disabled={busy || !visualUrl.trim()}
                  onClick={() =>
                    void applyVisualUpdate("from-url", { url: visualUrl.trim() })
                  }
                >
                  Apply from URL
                </Button>
              </div>

              <h3 className="mt-6 font-semibold">Revisi visual</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Contoh: “lebih hijau”, “lebih sharp”, “dark mode ringan”, “lebih hangat untuk cafe”.
              </p>
              <Textarea
                className="mt-3"
                value={visualInstruction}
                onChange={(e) => setVisualInstruction(e.target.value)}
                placeholder="Misal: buat lebih trust blue tapi radius lebih lembut"
                rows={4}
              />
              <div className="mt-3">
                <Button
                  disabled={busy || visualInstruction.trim().length < 3}
                  onClick={() =>
                    void applyVisualUpdate("revise", {
                      instruction: visualInstruction.trim(),
                    })
                  }
                >
                  Apply revision
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-semibold">Tokens</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(project.visual?.colors || []).map((color) => (
                  <div key={color.name} className="rounded-[14px] border border-[var(--border)] p-3">
                    <div
                      className="mb-2 h-10 rounded-[10px] border border-[var(--border)]"
                      style={{ background: color.hex }}
                    />
                    <p className="text-sm font-semibold">{color.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{color.hex}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {color.source} · {color.confidence}%
                    </p>
                  </div>
                ))}
              </div>
              {project.visual && (
                <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
                  <p>
                    Radii: button {project.visual.radii.button} · card {project.visual.radii.card} ·
                    modal {project.visual.radii.modal}
                  </p>
                  <p>Spacing: {project.visual.spacingScale.join(" / ")}</p>
                  <p>
                    Type:{" "}
                    {project.visual.typography.map((t) => `${t.category}:${t.family}`).join(" · ")}
                  </p>
                </div>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Warnings & notes</h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                {(project.visual?.warnings || ["No warnings yet."]).map((w) => (
                  <li key={w}>- {w}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Visual updates refresh tokens.css and export artifacts. Document text is preserved
                unless you regenerate from the wizard.
              </p>
            </Card>
          </div>
        </div>
      )}

      {tab === "export" && (
        <Card className="p-5 sm:p-6">
          <h3 className="text-xl font-bold">Cursor handoff</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Download the ZIP, extract it into your repository, then paste this instruction into
            Cursor Agent.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[16px] bg-[#0F172A] p-4 text-sm text-white">
            {buildCursorInstruction(project)}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(buildCursorInstruction(project));
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? <CheckCircle /> : <Copy />} Copy Cursor instruction
            </Button>
            <Button variant="secondary" onClick={() => void downloadBlueprintZip(project)}>
              <DownloadSimple /> Download Skill package
            </Button>
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold">Package contents</p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {project.artifacts.map((artifact) => (
                <li key={artifact.path}>- {artifact.path}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </AppShell>
  );
}

export type { SpecDocument };
