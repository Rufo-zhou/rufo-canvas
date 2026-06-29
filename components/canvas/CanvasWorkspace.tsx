"use client";

import {
  Background,
  ReactFlow,
  useEdgesState,
  useNodesState
} from "@xyflow/react";
import {
  AtSign,
  BookOpen,
  Box,
  Circle,
  Clock3,
  Cloud,
  Download,
  Frame,
  Gift,
  Grid3X3,
  ImagePlus,
  Layers,
  Lightbulb,
  MapPin,
  MessageCircle,
  MousePointer2,
  PenLine,
  Plus,
  SendHorizontal,
  Share2,
  Sparkles,
  Square,
  Type,
  Upload,
  WandSparkles,
  Zap
} from "lucide-react";
import type { CanvasEdge, CanvasNode } from "./types";

const initialNodes: CanvasNode[] = [];

const initialEdges: CanvasEdge[] = [];

const canvasTools = [
  { label: "Select", icon: MousePointer2, active: true },
  { label: "Marker", icon: MapPin },
  { label: "Image", icon: ImagePlus },
  { label: "Grid", icon: Grid3X3 },
  { label: "Frame", icon: Square },
  { label: "Draw", icon: PenLine },
  { label: "Text", icon: Type },
  { label: "Generate", icon: WandSparkles },
  { label: "Upload", icon: Upload },
  { label: "Chat", icon: MessageCircle }
];

const skillChips = [
  { label: "Seedance 2.0 视频创作", icon: Sparkles },
  { label: "一键到底视频", icon: Frame },
  { label: "Instagram Post", icon: ImagePlus },
  { label: "一键跨平台适配", icon: Layers },
  { label: "Logo 设计", icon: Grid3X3 },
  { label: "UGC：生活化上身图", icon: WandSparkles },
  { label: "AI 造型师：高转化模特图", icon: Sparkles },
  { label: "所有 Skills", icon: BookOpen }
];

export function CanvasWorkspace() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="grid h-screen grid-cols-[minmax(0,1fr)_360px] overflow-hidden bg-[#f7f7f8]">
      <section className="relative min-w-0 overflow-hidden">
        <header className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex h-12 items-center justify-between px-4">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              title="History"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm"
            >
              <Clock3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" className="text-sm font-semibold text-slate-800">
              Rufo
            </button>
            <button type="button" title="Project menu" className="rounded-md p-1 text-slate-500 hover:bg-white">
              <Circle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" title="Sync" className="rounded-md p-1 text-slate-500 hover:bg-white">
              <Cloud className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-3 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 fill-slate-500" aria-hidden="true" />
              70
            </span>
            <button type="button" title="Upgrade" className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          proOptions={{ hideAttribution: true }}
          className="bg-[#f7f7f8]"
        >
          <Background color="#eceff3" gap={96} size={0.6} />
        </ReactFlow>

        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-md text-sm text-slate-400">
            输入你的想法开始创作，或按 <kbd className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-500">C</kbd> 开始对话
          </p>
        </div>

        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 text-slate-500">
          <button type="button" title="Navigator" className="rounded-md p-1 hover:bg-white">
            <Circle className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" title="Layers" className="rounded-md p-1 hover:bg-white">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" title="Assets" className="rounded-md p-1 hover:bg-white">
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="h-4 w-px bg-slate-200" />
          <span className="text-xs">100%</span>
        </div>

        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-lg shadow-slate-200/70">
          {canvasTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                className={
                  tool.active
                    ? "flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white"
                    : "flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
        <header className="flex h-12 items-center justify-between px-4">
          <h2 className="text-sm font-semibold text-slate-900">新对话</h2>
          <div className="flex items-center gap-2 text-slate-400">
            <button type="button" title="Comments" className="rounded-md p-1 hover:bg-slate-100">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" title="Share" className="rounded-md p-1 hover:bg-slate-100">
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center px-5">
          <h3 className="mb-7 text-center text-sm font-semibold text-slate-900">试试这些 Rufo Skills</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {skillChips.map((skill) => {
              const Icon = skill.icon;

              return (
                <button
                  key={skill.label}
                  type="button"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Icon className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
                  {skill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-2 flex items-center justify-between rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-lime-500" aria-hidden="true" />
              大促返场：升级会员最高立享 57% OFF!
            </span>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
          <div className="rounded-b-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/70">
            <textarea
              className="h-20 w-full resize-none border-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Start with an idea, or type “@” to mention"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-500">
                <button type="button" title="Add" className="rounded-md p-1 hover:bg-slate-100">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" title="Reference" className="rounded-md p-1 hover:bg-slate-100">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" title="Mention agent" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-slate-100">
                  <AtSign className="h-4 w-4" aria-hidden="true" />
                  Agent
                </button>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <button type="button" title="Ideas" className="rounded-md p-1 hover:bg-slate-100">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" title="Model" className="rounded-md p-1 hover:bg-slate-100">
                  <Box className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Send"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
