"use client";

import { LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function UserMenu() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-slate-500 sm:block">{user?.email}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        退出
      </button>
    </div>
  );
}
