"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Trash2,
  X
} from "lucide-react";
import {
  clearProviderCredentials,
  loadProviderCredentials,
  saveProviderCredentials
} from "@/lib/media-generation/user-credentials";
import type { ProviderCredentials } from "@/lib/media-generation/types";

type ApiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onChange: (credentials: ProviderCredentials) => void;
};

const providers = [
  {
    id: "pollinationsApiKey",
    label: "Pollinations",
    description: "启用 Flux、Nano Banana、GPT Image、Seedream 与多种视频模型。",
    href: "https://enter.pollinations.ai/"
  },
  {
    id: "huggingFaceApiKey",
    label: "Hugging Face",
    description: "使用 Hugging Face Inference Providers 的免费推理额度。",
    href: "https://huggingface.co/settings/tokens"
  },
  {
    id: "agnesApiKey",
    label: "Agnes AI",
    description: "启用 Agnes Image 2.0/2.1 与 Agnes Video 2.0。",
    href: "https://platform.agnes-ai.com/settings/apiKeys"
  }
] as const;

export function ApiSettingsDialog({
  open,
  onClose,
  onChange
}: ApiSettingsDialogProps) {
  const [credentials, setCredentials] = useState<ProviderCredentials>({});
  const [remembered, setRemembered] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const stored = loadProviderCredentials();
    setCredentials(stored.credentials);
    setRemembered(stored.remembered);
    setSaved(false);
  }, [open]);

  if (!open) {
    return null;
  }

  function handleSave() {
    const nextCredentials = saveProviderCredentials(credentials, remembered);
    setCredentials(nextCredentials);
    onChange(nextCredentials);
    setSaved(true);
  }

  function handleClear() {
    clearProviderCredentials();
    setCredentials({});
    setRemembered(false);
    setSaved(false);
    onChange({});
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-settings-title"
        className="flex max-h-[min(720px,calc(100vh-32px))] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-white">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="api-settings-title" className="text-sm font-semibold text-slate-900">
                自助接入 API
              </h2>
              <p className="text-[11px] text-slate-500">使用你自己的免费额度和模型权限</p>
            </div>
          </div>
          <button
            type="button"
            title="关闭设置"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="space-y-3">
            {providers.map((provider) => {
              const value = credentials[provider.id] ?? "";
              const visible = Boolean(visibleFields[provider.id]);

              return (
                <section
                  key={provider.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{provider.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{provider.description}</p>
                    </div>
                    <a
                      href={provider.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      获取 Key
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                  <label className="block">
                    <span className="sr-only">{provider.label} API Key</span>
                    <span className="relative block">
                      <input
                        type={visible ? "text" : "password"}
                        value={value}
                        autoComplete="off"
                        placeholder={`输入 ${provider.label} API Key`}
                        onChange={(event) => {
                          setSaved(false);
                          setCredentials((current) => ({
                            ...current,
                            [provider.id]: event.target.value
                          }));
                        }}
                        className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 pr-11 font-mono text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                      />
                      <button
                        type="button"
                        title={visible ? "隐藏密钥" : "显示密钥"}
                        onClick={() =>
                          setVisibleFields((current) => ({
                            ...current,
                            [provider.id]: !current[provider.id]
                          }))
                        }
                        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
                      >
                        {visible ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </span>
                  </label>
                </section>
              );
            })}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg bg-slate-50 p-3">
            <input
              type="checkbox"
              checked={remembered}
              onChange={(event) => setRemembered(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-950"
            />
            <span>
              <span className="block text-xs font-semibold text-slate-800">在此设备记住密钥</span>
              <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                关闭时仅保存到当前浏览器会话。密钥不会写入项目、数据库或生成记录。
              </span>
            </span>
          </label>

          <p className="mt-3 text-[11px] leading-5 text-amber-700">
            仅在可信设备使用。生成请求会通过 HTTPS 把对应密钥临时发送到 Rufo 服务端调用供应商。
          </p>
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            清除全部
          </button>
          <div className="flex items-center gap-3">
            {saved ? <span className="text-xs font-medium text-emerald-600">已保存</span> : null}
            <button
              type="button"
              onClick={handleSave}
              className="h-9 rounded-md bg-slate-950 px-5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              保存设置
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
