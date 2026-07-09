import { Loader2 } from "lucide-react";

export default function ProjectCanvasLoading() {
  return (
    <main className="rufo-canvas flex min-h-dvh bg-[color:var(--rufo-canvas-bg)] text-[color:var(--rufo-canvas-fg)]">
      <section className="relative min-h-dvh flex-1 overflow-hidden">
        <header className="absolute left-0 right-0 top-0 z-10 flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-[color:var(--rufo-canvas-panel-muted)]" />
            <div className="h-8 w-44 rounded-md bg-[color:var(--rufo-canvas-panel-muted)]" />
            <div className="h-10 w-24 rounded-lg bg-[color:var(--rufo-canvas-panel-muted)]" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-[color:var(--rufo-canvas-panel-muted)]" />
            <div className="h-11 w-11 rounded-full bg-[color:var(--rufo-canvas-panel-muted)]" />
            <div className="h-11 w-11 rounded-full bg-[color:var(--rufo-canvas-panel-muted)]" />
          </div>
        </header>

        <div className="absolute inset-0 bg-[radial-gradient(var(--rufo-canvas-grid)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-[18%] top-[24%] h-56 w-80 rounded-lg border border-[color:var(--rufo-canvas-border)] bg-[color:var(--rufo-canvas-panel)] shadow-xl shadow-[color:var(--rufo-canvas-shadow)]" />
        <div className="absolute left-[48%] top-[34%] h-64 w-64 rounded-lg border border-[color:var(--rufo-canvas-border)] bg-[color:var(--rufo-canvas-panel)] shadow-xl shadow-[color:var(--rufo-canvas-shadow)]" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--rufo-canvas-border)] bg-[color:var(--rufo-canvas-panel)] px-4 py-3 text-sm shadow-lg shadow-[color:var(--rufo-canvas-shadow)]"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            正在加载 Rufo 画布
          </div>
        </div>
      </section>
    </main>
  );
}
