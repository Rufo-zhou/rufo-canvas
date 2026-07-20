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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
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
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(toAuthErrorMessage(error.message));
      }

      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoUser(null);
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
        return { requiresEmailConfirmation: false };
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        throw new Error(toAuthErrorMessage(error.message));
      }

      if (data.session) {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
        setDemoUser(null);
      }

      return { requiresEmailConfirmation: !data.session };
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
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        throw new Error(toAuthErrorMessage(error.message));
      }

      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setDemoUser(null);
      setSession(data.session ?? null);
      return;
    }

    const email = "guest@rufo.local";
    window.localStorage.setItem(DEMO_SESSION_KEY, email);
    setDemoUser(createDemoUser(email));
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
