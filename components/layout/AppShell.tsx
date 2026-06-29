import type { ReactNode } from "react";

export type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return <main className="min-h-screen bg-[#f7f7f8] text-slate-950">{children}</main>;
}
