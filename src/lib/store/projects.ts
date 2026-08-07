"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { projectBlueprintSchema, type ProjectBlueprint } from "@/lib/schema";
import { MAX_CHAT_MESSAGES, MAX_DOCUMENT_VERSIONS } from "@/lib/schema/limits";

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
    versions:
      project.versions.length > MAX_DOCUMENT_VERSIONS
        ? project.versions.slice(0, MAX_DOCUMENT_VERSIONS)
        : project.versions,
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

export async function saveProject(project: ProjectBlueprint) {
  const validated = projectBlueprintSchema.parse(trimBlueprintHistory(project));
  const db = await getDb();
  await db.put("projects", { ...validated, updatedAt: new Date().toISOString() });
}

export async function getProject(id: string) {
  const db = await getDb();
  const raw = await db.get("projects", id);
  if (!raw) return undefined;
  return projectBlueprintSchema.parse(raw);
}

export async function listProjects() {
  const db = await getDb();
  const all = await db.getAll("projects");
  const projects = all.flatMap((raw) => {
    const parsed = projectBlueprintSchema.safeParse(raw);
    return parsed.success ? [parsed.data] : [];
  });
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(id: string) {
  const db = await getDb();
  await db.delete("projects", id);
}
