"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Loader2, Plus, SendHorizontal, Trash2 } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createProject, deleteProject, listProjects, type Project } from "@/lib/supabase/database";
import { createLocalProject, deleteLocalProject, listLocalProjects } from "@/lib/local/database";
import { useAuth } from "@/components/auth/AuthProvider";

export type ProjectDashboardProps = {
  mode: "home" | "projects";
};

export function ProjectDashboard({ mode }: ProjectDashboardProps) {
  return (
    <AuthGate>
      <ProjectDashboardContent mode={mode} />
    </AuthGate>
  );
}

function ProjectDashboardContent({ mode }: ProjectDashboardProps) {
  const router = useRouter();
  const { mode: appMode, user } = useAuth();
  const supabase = appMode === "supabase" ? getSupabaseBrowserClient() : null;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextProjects =
        appMode === "demo" ? await listLocalProjects() : await listProjects(requireSupabase(supabase));
      setProjects(nextProjects);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "项目加载失败。");
    } finally {
      setLoading(false);
    }
  }, [appMode, supabase]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  async function handleCreateFromPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const name = prompt.trim().slice(0, 28) || "Untitled Project";
      const project =
        appMode === "demo"
          ? await createLocalProject(name, user.id)
          : await createProject(requireSupabase(supabase), { name, ownerId: user.id });
      const query = prompt.trim() ? `?prompt=${encodeURIComponent(prompt.trim())}` : "";
      router.push(`/projects/${project.id}${query}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "项目创建失败。");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const name = projectName.trim() || "Untitled Project";
      const project =
        appMode === "demo"
          ? await createLocalProject(name, user.id)
          : await createProject(requireSupabase(supabase), { name, ownerId: user.id });
      setProjectName("");
      await refreshProjects();
      router.push(`/projects/${project.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "项目创建失败。");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    setError(null);

    try {
      if (appMode === "demo") {
        await deleteLocalProject(projectId);
      } else {
        await deleteProject(requireSupabase(supabase), projectId);
      }
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "项目删除失败。");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8]">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
        <Link href="/" className="text-lg font-semibold text-slate-950">
          Rufo
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/projects" className="text-sm font-medium text-slate-600 hover:text-slate-950">
            项目
          </Link>
          <UserMenu />
        </nav>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 py-10">
        {mode === "home" ? (
          <div className="mb-10">
            <h1 className="mb-4 text-3xl font-semibold tracking-normal text-slate-950">开始一次新的视觉创作</h1>
            <form onSubmit={handleCreateFromPrompt} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-200/70">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="h-28 w-full resize-none border-0 px-2 py-2 text-base text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="输入你的想法，例如：为一款极简香氛产品生成电商主图"
              />
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">将自动创建项目并进入无限画布</span>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
                  开始创作
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">项目列表</h1>
              <p className="mt-1 text-sm text-slate-500">管理所有 Rufo 画布项目。</p>
            </div>
            <form onSubmit={handleCreateProject} className="flex gap-2">
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="h-10 w-56 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900"
                placeholder="项目名称"
              />
              <button
                type="submit"
                disabled={creating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                新建
              </button>
            </form>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{mode === "home" ? "最近项目" : "全部项目"}</h2>
          {mode === "home" ? (
            <Link href="/projects" className="text-sm font-medium text-slate-500 hover:text-slate-950">
              查看全部
            </Link>
          ) : null}
        </div>

        {error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <div className="flex h-48 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
            正在加载项目
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">还没有项目。输入一个创作想法或点击新建开始。</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(mode === "home" ? projects.slice(0, 6) : projects).map((project) => (
              <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Link href={`/projects/${project.id}`} className="block">
                  <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
                    Rufo Canvas
                  </div>
                  <h3 className="truncate text-base font-semibold text-slate-950">{project.name}</h3>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {new Date(project.updated_at).toLocaleString()}
                  </p>
                </Link>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleDeleteProject(project.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function requireSupabase(client: ReturnType<typeof getSupabaseBrowserClient> | null) {
  if (!client) {
    throw new Error("Supabase 客户端未配置。");
  }

  return client;
}
