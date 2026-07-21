"use client";

import { useState, type FormEvent } from "react";
import { Loader2, LogIn, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function AuthPanel() {
  const { mode: appMode, signIn, signUp, signInAnonymously, signInWithGoogle } = useAuth();
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        const result = await signIn(email, password);
        if (result.fallbackToDemo) {
          setMessage("Supabase 暂时不可达，已使用这个邮箱进入本地画布。云端恢复后请重新登录同步数据。");
        }
      } else {
        const result = await signUp(email, password);
        setMessage(
          result.fallbackToDemo
            ? "本地账号已创建并登录。"
            : result.requiresEmailConfirmation
              ? `确认邮件已发送到 ${email}。请使用这个邮箱完成确认后登录，并检查垃圾邮件。`
              : `账号 ${email} 注册成功，已自动登录。`
        );
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "认证失败，请重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithGoogle();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Google 登录失败，请重试。");
      setSubmitting(false);
    }
  }

  async function handleGuestSignIn() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await signInAnonymously();
      if (result.fallbackToDemo) {
        setMessage("已进入本地游客画布。Supabase 恢复后，可重新登录使用云端项目。");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "访客登录失败，请重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f8] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-950">Rufo</h1>
          <p className="mt-1 text-sm text-slate-500">登录后继续使用无限画布生图工作台。</p>
          {appMode === "demo" ? (
            <p className="mt-2 text-xs text-amber-700">本地演示模式：输入任意邮箱和至少 6 位密码即可进入。</p>
          ) : null}
        </div>

        <div className="mb-4 grid gap-2">
          {googleAuthEnabled ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-blue-600" aria-hidden="true">
                G
              </span>
              使用 Google 继续
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            以访客身份直接进入
          </button>
          <p className="text-center text-xs text-slate-400">访客数据仅绑定当前浏览器，请勿清除网站数据。</p>
        </div>

        <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          或使用邮箱
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "rounded-md bg-white px-3 py-2 font-medium shadow-sm" : "px-3 py-2 text-slate-500"}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "rounded-md bg-white px-3 py-2 font-medium shadow-sm" : "px-3 py-2 text-slate-500"}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {mode === "login" ? "注册时使用的邮箱" : "用于注册和登录的邮箱"}
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              placeholder={mode === "login" ? "输入你注册时填写的邮箱" : "例如 name@example.com"}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">密码</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              placeholder="至少 6 位"
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : mode === "login" ? <LogIn className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          {mode === "login"
            ? "请使用注册时填写的同一个邮箱和密码。"
            : "注册成功后，这个邮箱就是你的 Rufo 登录账号。"}
        </p>
      </div>
    </div>
  );
}
