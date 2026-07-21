"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getAppMode, type AppMode } from "@/lib/app-mode";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

type AuthContextValue = {
  mode: AppMode;
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthSignUpResult>;
  signInAnonymously: () => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
};

type AuthActionResult = {
  fallbackToDemo: boolean;
};

type AuthSignUpResult = AuthActionResult & {
  requiresEmailConfirmation: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_SESSION_KEY = "rufo.demo.user";

export type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const mode = getAppMode();
  const configured = mode === "demo" || hasSupabaseBrowserConfig();
  const [session, setSession] = useState<Session | null>(null);
  const [demoUser, setDemoUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localEmail = window.localStorage.getItem(DEMO_SESSION_KEY);
    setDemoUser(localEmail ? createDemoUser(localEmail) : null);

    if (mode === "demo") {
      setSession(null);
      setLoading(false);
      return;
    }

    if (!configured) {
      setSession(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setSession(null);
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [configured, mode]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (mode === "demo") {
        if (password.length < 6) {
          throw new Error("密码至少需要 6 位。");
        }

        window.localStorage.setItem(DEMO_SESSION_KEY, email);
        setDemoUser(createDemoUser(email));
        return { fallbackToDemo: true };
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth
        .signInWithPassword({ email, password })
        .catch((caughtError: unknown) => ({
          error: toAuthLikeError(caughtError)
        }));

      if (error) {
        if (isSupabaseUnavailableError(error)) {
          startDemoSession(email, setDemoUser);
          return { fallbackToDemo: true };
        }

        throw new Error(toAuthErrorMessage(error.message));
      }

      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoUser(null);
      return { fallbackToDemo: false };
    },
    [mode]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (mode === "demo") {
        if (password.length < 6) {
          throw new Error("密码至少需要 6 位。");
        }

        window.localStorage.setItem(DEMO_SESSION_KEY, email);
        setDemoUser(createDemoUser(email));
        return { fallbackToDemo: true, requiresEmailConfirmation: false };
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth
        .signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        })
        .catch((caughtError: unknown) => ({
          data: { session: null },
          error: toAuthLikeError(caughtError)
        }));

      if (error) {
        if (isSupabaseUnavailableError(error)) {
          startDemoSession(email, setDemoUser);
          return { fallbackToDemo: true, requiresEmailConfirmation: false };
        }

        throw new Error(toAuthErrorMessage(error.message));
      }

      if (data.session) {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
        setDemoUser(null);
      }

      return {
        fallbackToDemo: false,
        requiresEmailConfirmation: !data.session
      };
    },
    [mode]
  );

  const signInWithGoogle = useCallback(async () => {
    if (mode === "demo") {
      const email = "google-demo@rufo.local";
      window.localStorage.setItem(DEMO_SESSION_KEY, email);
      setDemoUser(createDemoUser(email));
      return;
    }

    window.localStorage.removeItem(DEMO_SESSION_KEY);
    setDemoUser(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account"
        }
      }
    });

    if (error) {
      throw new Error(toAuthErrorMessage(error.message));
    }
  }, [mode]);

  const signInAnonymously = useCallback(async () => {
    if (mode !== "demo") {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth
        .signInAnonymously()
        .catch((caughtError: unknown) => ({
          data: { session: null },
          error: toAuthLikeError(caughtError)
        }));

      if (error) {
        if (isAnonymousFallbackError(error)) {
          startDemoSession("guest@rufo.local", setDemoUser);
          setSession(null);
          return { fallbackToDemo: true };
        }

        throw new Error(toAuthErrorMessage(error.message));
      }

      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoUser(null);
      setSession(data.session ?? null);
      return { fallbackToDemo: false };
    }

    const email = "guest@rufo.local";
    window.localStorage.setItem(DEMO_SESSION_KEY, email);
    setDemoUser(createDemoUser(email));
    return { fallbackToDemo: true };
  }, [mode]);

  const signOut = useCallback(async () => {
    if (mode === "demo" || !session) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoUser(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    window.localStorage.removeItem(DEMO_SESSION_KEY);
    setDemoUser(null);
  }, [mode, session]);

  const getAccessToken = useCallback(async () => {
    if (mode === "demo" || (!session && demoUser)) {
      return "rufo-local-demo";
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(error?.message ?? "User is not authenticated.");
    }

    return data.session.access_token;
  }, [demoUser, mode, session]);

  const user = session?.user ?? demoUser;
  const effectiveMode: AppMode = mode === "demo" || (!session && demoUser) ? "demo" : "supabase";

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: effectiveMode,
      session,
      user,
      loading,
      configured,
      signIn,
      signUp,
      signInAnonymously,
      signInWithGoogle,
      signOut,
      getAccessToken
    }),
    [
      configured,
      effectiveMode,
      getAccessToken,
      loading,
      session,
      signIn,
      signInAnonymously,
      signInWithGoogle,
      signOut,
      signUp,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function toAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (isSupabaseUnavailableMessage(normalized)) {
    return "无法连接 Supabase。项目可能已暂停、网络不可达或域名解析失败，请稍后重试；你也可以先用本地游客模式进入画布。";
  }

  if (normalized.includes("invalid login credentials")) {
    return "邮箱或密码不正确。请使用注册时填写的邮箱登录。";
  }

  if (normalized.includes("email not confirmed")) {
    return "该邮箱尚未完成确认，请检查收件箱和垃圾邮件。";
  }

  if (normalized.includes("user already registered")) {
    return "该邮箱已经注册，请切换到登录。";
  }

  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) {
    return "Google 登录尚未在 Supabase 中启用。";
  }

  if (normalized.includes("anonymous") && normalized.includes("disabled")) {
    return "访客登录尚未在 Supabase Auth 中启用，请在 Supabase 后台开启 Anonymous sign-ins。";
  }

  if (normalized.includes("password should be at least")) {
    return "密码长度不足，请至少输入 6 位。";
  }

  return message;
}

function startDemoSession(
  email: string,
  setDemoUser: (user: User | null) => void
) {
  window.localStorage.setItem(DEMO_SESSION_KEY, email);
  setDemoUser(createDemoUser(email));
}

function isAnonymousFallbackError(error: { message?: string; name?: string; status?: number }) {
  const normalized = error.message?.toLowerCase() ?? "";
  return isSupabaseUnavailableError(error) || (
    normalized.includes("anonymous") &&
    (normalized.includes("disabled") || normalized.includes("not enabled"))
  );
}

function isSupabaseUnavailableError(error: { message?: string; name?: string; status?: number }) {
  const normalized = error.message?.toLowerCase() ?? "";
  return (
    error.status === 0 ||
    error.name === "AuthRetryableFetchError" ||
    isSupabaseUnavailableMessage(normalized)
  );
}

function isSupabaseUnavailableMessage(normalizedMessage: string) {
  return (
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("network request failed") ||
    normalizedMessage.includes("enotfound") ||
    normalizedMessage.includes("timeout")
  );
}

function toAuthLikeError(error: unknown) {
  return {
    message: error instanceof Error ? error.message : "fetch failed",
    name:
      error instanceof Error
        ? error.name
        : "AuthRetryableFetchError",
    status: 0
  };
}

function createDemoUser(email: string): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    app_metadata: {},
    user_metadata: { display_name: "Rufo Demo" },
    aud: "authenticated",
    created_at: new Date(0).toISOString(),
    email
  };
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
