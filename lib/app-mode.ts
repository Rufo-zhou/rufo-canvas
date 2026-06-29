export type AppMode = "demo" | "supabase";

export function getAppMode(): AppMode {
  return process.env.NEXT_PUBLIC_APP_MODE === "supabase" ? "supabase" : "demo";
}
