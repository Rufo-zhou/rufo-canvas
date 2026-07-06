"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { RufoOnboarding } from "@/components/onboarding/RufoOnboarding";
import { AuthPanel } from "./AuthPanel";
import { useAuth } from "./AuthProvider";

export type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { configured, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        正在加载 Rufo
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <h1 className="text-lg font-semibold text-slate-950">需要配置 Supabase</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            请在项目根目录创建 <code className="rounded bg-slate-100 px-1 py-0.5">.env.local</code>，
            并填写 <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> 与{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
            完成后重启开发服务器。
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            或设置 <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_APP_MODE=demo</code>{" "}
            使用本地演示模式。
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <>
      {children}
      <RufoOnboarding />
    </>
  );
}
