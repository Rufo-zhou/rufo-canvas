"use client";

import type { MediaGenerationProvider, ProviderCredentials } from "./types";

const SESSION_STORAGE_KEY = "rufo.provider-credentials.session";
const LOCAL_STORAGE_KEY = "rufo.provider-credentials.local";

export type StoredProviderCredentials = {
  credentials: ProviderCredentials;
  remembered: boolean;
};

export function loadProviderCredentials(): StoredProviderCredentials {
  if (typeof window === "undefined") {
    return { credentials: {}, remembered: false };
  }

  const remembered = readStoredCredentials(window.localStorage, LOCAL_STORAGE_KEY);
  if (remembered) {
    return { credentials: remembered, remembered: true };
  }

  return {
    credentials:
      readStoredCredentials(window.sessionStorage, SESSION_STORAGE_KEY) ?? {},
    remembered: false
  };
}

export function saveProviderCredentials(
  credentials: ProviderCredentials,
  rememberOnDevice: boolean
) {
  const sanitized = sanitizeProviderCredentials(credentials);
  const serialized = JSON.stringify(sanitized);

  if (rememberOnDevice) {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  return sanitized;
}

export function clearProviderCredentials() {
  window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function hasProviderCredential(
  provider: MediaGenerationProvider,
  credentials: ProviderCredentials
) {
  if (provider === "pollinations") {
    return Boolean(credentials.pollinationsApiKey);
  }
  if (provider === "huggingface") {
    return Boolean(credentials.huggingFaceApiKey);
  }
  if (provider === "agnes") {
    return Boolean(credentials.agnesApiKey);
  }

  return provider === "pollinations-free";
}

export function credentialsForProvider(
  provider: MediaGenerationProvider,
  credentials: ProviderCredentials
): ProviderCredentials | undefined {
  if (provider === "pollinations" && credentials.pollinationsApiKey) {
    return { pollinationsApiKey: credentials.pollinationsApiKey };
  }
  if (provider === "huggingface" && credentials.huggingFaceApiKey) {
    return { huggingFaceApiKey: credentials.huggingFaceApiKey };
  }
  if (provider === "agnes" && credentials.agnesApiKey) {
    return { agnesApiKey: credentials.agnesApiKey };
  }

  return undefined;
}

function sanitizeProviderCredentials(credentials: ProviderCredentials) {
  return {
    pollinationsApiKey: cleanCredential(credentials.pollinationsApiKey),
    huggingFaceApiKey: cleanCredential(credentials.huggingFaceApiKey),
    agnesApiKey: cleanCredential(credentials.agnesApiKey)
  };
}

function cleanCredential(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readStoredCredentials(storage: Storage, key: string) {
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return sanitizeProviderCredentials({
      pollinationsApiKey: readString(parsed.pollinationsApiKey),
      huggingFaceApiKey: readString(parsed.huggingFaceApiKey),
      agnesApiKey: readString(parsed.agnesApiKey)
    });
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
