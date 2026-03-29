"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Palette, Save } from "lucide-react";
import { useToast } from "./page";

type ThemeToneKey =
  | "background"
  | "foreground"
  | "card"
  | "primary"
  | "secondary"
  | "muted"
  | "accent"
  | "border"
  | "input"
  | "ring";

type ThemeTone = Record<ThemeToneKey, string>;

type ThemeState = {
  radius: string;
  dark: ThemeTone;
  light: ThemeTone;
};

interface ThemeSettingsManagementProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const TONE_FIELDS: Array<{ key: ThemeToneKey; label: string }> = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "card", label: "Card" },
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "muted", label: "Muted" },
  { key: "accent", label: "Accent" },
  { key: "border", label: "Border" },
  { key: "input", label: "Input" },
  { key: "ring", label: "Ring" },
];

const defaultTone: ThemeTone = {
  background: "#000000",
  foreground: "#ffffff",
  card: "#0a0a0a",
  primary: "#ffffff",
  secondary: "#18181b",
  muted: "#18181b",
  accent: "#18181b",
  border: "#27272a",
  input: "#27272a",
  ring: "#ffffff",
};

const defaultSettings: ThemeState = {
  radius: "0rem",
  dark: { ...defaultTone },
  light: {
    background: "#fafafa",
    foreground: "#111111",
    card: "#ffffff",
    primary: "#111111",
    secondary: "#f4f4f5",
    muted: "#f4f4f5",
    accent: "#f4f4f5",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#111111",
  },
};

function pickTone(input: unknown, fallback: ThemeTone): ThemeTone {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    background: typeof source.background === "string" ? source.background : fallback.background,
    foreground: typeof source.foreground === "string" ? source.foreground : fallback.foreground,
    card: typeof source.card === "string" ? source.card : fallback.card,
    primary: typeof source.primary === "string" ? source.primary : fallback.primary,
    secondary: typeof source.secondary === "string" ? source.secondary : fallback.secondary,
    muted: typeof source.muted === "string" ? source.muted : fallback.muted,
    accent: typeof source.accent === "string" ? source.accent : fallback.accent,
    border: typeof source.border === "string" ? source.border : fallback.border,
    input: typeof source.input === "string" ? source.input : fallback.input,
    ring: typeof source.ring === "string" ? source.ring : fallback.ring,
  };
}

function normalizeThemeResponse(payload: unknown): ThemeState {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return {
    radius: typeof source.radius === "string" ? source.radius : defaultSettings.radius,
    dark: pickTone(source.dark, defaultSettings.dark),
    light: pickTone(source.light, defaultSettings.light),
  };
}

function ToneEditor({
  label,
  values,
  onChange,
}: {
  label: string;
  values: ThemeTone;
  onChange: (key: ThemeToneKey, value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</h3>
      <div className="grid grid-cols-1 gap-3">
        {TONE_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{field.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="h-9 w-9 rounded border border-zinc-700 bg-transparent p-0"
              />
              <input
                type="text"
                value={values[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ThemeSettingsManagement({ onDirtyChange }: ThemeSettingsManagementProps) {
  const { addToast } = useToast();
  const isMountedRef = useRef(true);
  const initialSnapshotRef = useRef(JSON.stringify(defaultSettings));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeState>(defaultSettings);

  const currentSnapshot = useMemo(() => JSON.stringify(theme), [theme]);
  const isDirty = !loading && currentSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();

    const fetchTheme = async () => {
      try {
        const res = await fetch("/api/admin/settings/theme", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.theme) {
          throw new Error(data?.error || "Failed to load theme settings");
        }

        if (!isMountedRef.current || controller.signal.aborted) return;

        const normalized = normalizeThemeResponse(data.theme);
        setTheme(normalized);
        initialSnapshotRef.current = JSON.stringify(normalized);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          console.error("Failed to fetch theme settings:", error);
          addToast("Failed to load theme settings", "error");
        }
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTheme();

    return () => {
      isMountedRef.current = false;
      controller.abort();
      onDirtyChange?.(false);
    };
  }, [addToast, onDirtyChange]);

  const handleSaveTheme = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update theme settings");
      }

      initialSnapshotRef.current = currentSnapshot;
      onDirtyChange?.(false);
      addToast("Theme system updated", "success");
    } catch (error) {
      addToast((error as Error)?.message || "Failed to update theme settings", "error");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [addToast, currentSnapshot, onDirtyChange, saving, theme]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-white">Theme System</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Server-driven design tokens injected at layout level for stable first paint.
          </p>
        </div>
        <button
          onClick={() => {
            void handleSaveTheme();
          }}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 font-medium text-zinc-900 transition-colors hover:bg-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Theme Tokens
        </button>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-3 flex items-center gap-2 text-zinc-300">
          <Palette size={14} />
          <p className="text-xs uppercase tracking-[0.2em]">Global Radius</p>
        </div>
        <div className="flex flex-col gap-2 md:max-w-sm">
          <input
            type="text"
            value={theme.radius}
            onChange={(e) => setTheme((prev) => ({ ...prev, radius: e.target.value }))}
            placeholder="0rem"
            className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-xs font-mono text-zinc-200 outline-none focus:border-zinc-600"
          />
          <p className="text-[11px] text-zinc-500">Use values like 0rem, 0.5rem, or 8px.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ToneEditor
          label="Dark Tokens"
          values={theme.dark}
          onChange={(key, value) =>
            setTheme((prev) => ({
              ...prev,
              dark: { ...prev.dark, [key]: value },
            }))
          }
        />
        <ToneEditor
          label="Light Tokens"
          values={theme.light}
          onChange={(key, value) =>
            setTheme((prev) => ({
              ...prev,
              light: { ...prev.light, [key]: value },
            }))
          }
        />
      </div>
    </div>
  );
}