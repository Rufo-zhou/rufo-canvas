import type { CanvasSnapshot } from "@/components/canvas/types";
import type { Project } from "@/lib/supabase/database";

const PROJECTS_KEY = "rufo.demo.projects";
const SNAPSHOT_PREFIX = "rufo.demo.canvas.";

function readProjects(): Project[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return JSON.parse(window.localStorage.getItem(PROJECTS_KEY) ?? "[]") as Project[];
  } catch {
    return [];
  }
}

function writeProjects(projects: Project[]) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export async function listLocalProjects() {
  return readProjects().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getLocalProject(projectId: string) {
  const project = readProjects().find((item) => item.id === projectId);

  if (!project) {
    throw new Error("项目不存在或已被删除。");
  }

  return project;
}

export async function createLocalProject(name: string, ownerId: string) {
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    name,
    created_at: now,
    updated_at: now
  };

  writeProjects([project, ...readProjects()]);
  return project;
}

export async function deleteLocalProject(projectId: string) {
  writeProjects(readProjects().filter((project) => project.id !== projectId));
  window.localStorage.removeItem(`${SNAPSHOT_PREFIX}${projectId}`);
}

export async function updateLocalProjectName(projectId: string, name: string) {
  const now = new Date().toISOString();
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === projectId);

  if (index < 0) {
    throw new Error("项目不存在或已被删除。");
  }

  projects[index] = {
    ...projects[index],
    name,
    updated_at: now
  };
  writeProjects(projects);
  return projects[index];
}

export async function loadLocalCanvasSnapshot(projectId: string) {
  const value = window.localStorage.getItem(`${SNAPSHOT_PREFIX}${projectId}`);

  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as CanvasSnapshot;
  } catch {
    return undefined;
  }
}

export async function saveLocalCanvasSnapshot(projectId: string, snapshot: CanvasSnapshot) {
  window.localStorage.setItem(`${SNAPSHOT_PREFIX}${projectId}`, JSON.stringify(snapshot));

  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === projectId);

  if (index >= 0) {
    projects[index] = {
      ...projects[index],
      updated_at: snapshot.updatedAt
    };
    writeProjects(projects);
  }
}
