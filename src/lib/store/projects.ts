"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { projectBlueprintSchema, type ProjectBlueprint } from "@/lib/schema";
import { MAX_CHAT_MESSAGES, MAX_DOCUMENT_VERSIONS } from "@/lib/schema/limits";

function trimVersionHistory(
  versions: ProjectBlueprint["versions"],
  documents: ProjectBlueprint["documents"],
): ProjectBlueprint["versions"] {
  if (versions.length <= MAX_DOCUMENT_VERSIONS) {
    return versions;
  }

  const newestFirst = [...versions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const preserveKeys = new Set(
    documents.filter((doc) => doc.isDetailed).map((doc) => doc.key),
  );

  const mustKeep = new Map<string, ProjectBlueprint["versions"][number]>();
  for (const version of newestFirst) {
    if (preserveKeys.has(version.documentKey) && !mustKeep.has(version.documentKey)) {
      mustKeep.set(version.documentKey, version);
    }
  }
  const mustKeepIds = new Set([...mustKeep.values()].map((version) => version.id));

  const kept: ProjectBlueprint["versions"] = [...mustKeep.values()];
  for (const version of newestFirst) {
    if (kept.length >= MAX_DOCUMENT_VERSIONS) {
      break;
    }
    if (mustKeepIds.has(version.id)) {
      continue;
    }
    kept.push(version);
  }

  kept.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return kept.slice(0, MAX_DOCUMENT_VERSIONS);
}

/** Drop oldest chat/version entries so persisted blueprints stay within schema caps. */
export function trimBlueprintHistory(project: ProjectBlueprint): ProjectBlueprint {
  if (
    project.chat.length <= MAX_CHAT_MESSAGES &&
    project.versions.length <= MAX_DOCUMENT_VERSIONS
  ) {
    return project;
  }

  return {
    ...project,
    chat:
      project.chat.length > MAX_CHAT_MESSAGES
        ? project.chat.slice(-MAX_CHAT_MESSAGES)
        : project.chat,
    versions: trimVersionHistory(project.versions, project.documents),
  };
}

interface SpekDuluDb extends DBSchema {
  projects: {
    key: string;
    value: ProjectBlueprint;
    indexes: { "by-updated": string };
  };
}

let dbPromise: Promise<IDBPDatabase<SpekDuluDb>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SpekDuluDb>("spekdulu", 1, {
      upgrade(db) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: ProjectBlueprint): Promise<ProjectBlueprint> {
  const validated = projectBlueprintSchema.parse(trimBlueprintHistory(project));
  const db = await getDb();
  const saved = { ...validated, updatedAt: new Date().toISOString() };
  await db.put("projects", saved);
  return saved;
}

function parseStoredProject(raw: ProjectBlueprint): ProjectBlueprint {
  const trimmed = trimBlueprintHistory(raw);
  return projectBlueprintSchema.parse(trimmed);
}

export async function getProject(id: string) {
  const db = await getDb();
  const raw = await db.get("projects", id);
  if (!raw) return undefined;
  return parseStoredProject(raw);
}

export async function listProjects() {
  const db = await getDb();
  const all = await db.getAll("projects");
  const projects = all.flatMap((raw) => {
    try {
      return [parseStoredProject(raw)];
    } catch {
      return [];
    }
  });
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(id: string) {
  const db = await getDb();
  await db.delete("projects", id);
}
