import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import getDatabase from "@/lib/mongodb";

export type ThemePalette = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

export type ThemeConfig = {
  radius: string;
  dark: ThemePalette;
  light: ThemePalette;
};

export type StoreConfig = {
  theme: ThemeConfig;
  updatedAt: string | null;
};

type ThemeConfigInput = Partial<ThemeConfig> & {
  dark?: Partial<ThemePalette>;
  light?: Partial<ThemePalette>;
};

const COLOR_TOKEN_PATTERN = /^[#a-zA-Z0-9(),.%\s/:+-]+$/;
const RADIUS_TOKEN_PATTERN = /^\d+(\.\d+)?(px|rem)$/;

const THEME_VAR_MAP: Record<keyof ThemePalette, string> = {
  background: "background",
  foreground: "foreground",
  card: "card",
  cardForeground: "card-foreground",
  popover: "popover",
  popoverForeground: "popover-foreground",
  primary: "primary",
  primaryForeground: "primary-foreground",
  secondary: "secondary",
  secondaryForeground: "secondary-foreground",
  muted: "muted",
  mutedForeground: "muted-foreground",
  accent: "accent",
  accentForeground: "accent-foreground",
  destructive: "destructive",
  border: "border",
  input: "input",
  ring: "ring",
  sidebar: "sidebar",
  sidebarForeground: "sidebar-foreground",
  sidebarPrimary: "sidebar-primary",
  sidebarPrimaryForeground: "sidebar-primary-foreground",
  sidebarAccent: "sidebar-accent",
  sidebarAccentForeground: "sidebar-accent-foreground",
  sidebarBorder: "sidebar-border",
  sidebarRing: "sidebar-ring",
};

const PALETTE_KEYS = Object.keys(THEME_VAR_MAP) as Array<keyof ThemePalette>;

export const THEME_COOKIE_NAME = "pg_theme_tokens";

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  radius: "0rem",
  dark: {
    background: "#000000",
    foreground: "#ffffff",
    card: "#0a0a0a",
    cardForeground: "#ffffff",
    popover: "#000000",
    popoverForeground: "#ffffff",
    primary: "#ffffff",
    primaryForeground: "#000000",
    secondary: "#18181b",
    secondaryForeground: "#ffffff",
    muted: "#18181b",
    mutedForeground: "#85858b",
    accent: "#18181b",
    accentForeground: "#ffffff",
    destructive: "#ef4444",
    border: "#27272a",
    input: "#27272a",
    ring: "#ffffff",
    sidebar: "#050505",
    sidebarForeground: "#ffffff",
    sidebarPrimary: "#ffffff",
    sidebarPrimaryForeground: "#050505",
    sidebarAccent: "#18181b",
    sidebarAccentForeground: "#ffffff",
    sidebarBorder: "#27272a",
    sidebarRing: "#ffffff",
  },
  light: {
    background: "#fafafa",
    foreground: "#111111",
    card: "#ffffff",
    cardForeground: "#111111",
    popover: "#ffffff",
    popoverForeground: "#111111",
    primary: "#111111",
    primaryForeground: "#ffffff",
    secondary: "#f4f4f5",
    secondaryForeground: "#111111",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    accent: "#f4f4f5",
    accentForeground: "#111111",
    destructive: "#ef4444",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#111111",
    sidebar: "#ffffff",
    sidebarForeground: "#111111",
    sidebarPrimary: "#111111",
    sidebarPrimaryForeground: "#ffffff",
    sidebarAccent: "#f4f4f5",
    sidebarAccentForeground: "#111111",
    sidebarBorder: "#e4e4e7",
    sidebarRing: "#111111",
  },
};

const getStoreConfigCached = unstable_cache(
  async (): Promise<StoreConfig> => {
    try {
      const db = await getDatabase();
      const doc = (await db.collection("settings").findOne({ _id: "theme_tokens" as any })) as
        | ({
            theme?: unknown;
            updatedAt?: Date;
          } & Record<string, unknown>)
        | null;

      const theme = normalizeThemeConfig(doc?.theme ?? doc ?? null);
      const updatedAt = doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null;

      return { theme, updatedAt };
    } catch (error) {
      console.error("Failed to load site config:", error);
      return {
        theme: DEFAULT_THEME_CONFIG,
        updatedAt: null,
      };
    }
  },
  ["site_config:v1"],
  {
    tags: ["site_config"],
    revalidate: 60 * 60,
  }
);

function sanitizeColorToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 64) return fallback;
  if (!COLOR_TOKEN_PATTERN.test(trimmed)) return fallback;
  return trimmed;
}

function sanitizeRadiusToken(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!RADIUS_TOKEN_PATTERN.test(trimmed)) return fallback;
  return trimmed;
}

function sanitizePaletteInput(input: unknown, fallback: ThemePalette): ThemePalette {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const next: ThemePalette = { ...fallback };

  for (const key of PALETTE_KEYS) {
    next[key] = sanitizeColorToken(source[key], fallback[key]);
  }

  return next;
}

export function normalizeThemeConfig(input: unknown): ThemeConfig {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    radius: sanitizeRadiusToken(source.radius, DEFAULT_THEME_CONFIG.radius),
    dark: sanitizePaletteInput(source.dark, DEFAULT_THEME_CONFIG.dark),
    light: sanitizePaletteInput(source.light, DEFAULT_THEME_CONFIG.light),
  };
}

export function mergeThemeConfig(current: ThemeConfig, patch: unknown): ThemeConfig {
  const source = patch && typeof patch === "object" ? (patch as ThemeConfigInput) : {};

  return {
    radius: sanitizeRadiusToken(source.radius, current.radius),
    dark: sanitizePaletteInput(source.dark, current.dark),
    light: sanitizePaletteInput(source.light, current.light),
  };
}

export function toThemeCssVariables(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {
    "--theme-radius": theme.radius,
  };

  for (const key of PALETTE_KEYS) {
    const cssToken = THEME_VAR_MAP[key];
    vars[`--theme-dark-${cssToken}`] = theme.dark[key];
    vars[`--theme-light-${cssToken}`] = theme.light[key];
  }

  return vars;
}

export function getThemeCookiePayload(theme: ThemeConfig): string {
  const vars = toThemeCssVariables(theme);
  const compact: Record<string, string> = {};

  for (const [key, value] of Object.entries(vars)) {
    compact[key.replace(/^--/, "")] = value;
  }

  return JSON.stringify(compact);
}

export function getThemeCookieBootstrapScript(): string {
  const keys = Object.keys(toThemeCssVariables(DEFAULT_THEME_CONFIG)).map((k) => k.replace(/^--/, ""));
  const keysJson = JSON.stringify(keys);

  return `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE_NAME}=([^;]+)/);if(!m||!m[1])return;var once=decodeURIComponent(m[1]);var parsed;try{parsed=JSON.parse(once);}catch(_e){try{parsed=JSON.parse(decodeURIComponent(once));}catch(_e2){return;}}if(!parsed||typeof parsed!=="object")return;var root=document.documentElement;var keys=${keysJson};for(var i=0;i<keys.length;i++){var key=keys[i];var value=parsed[key];if(typeof value==="string"){root.style.setProperty("--"+key,value);}}}catch(e){}})();`;
}

function getThemeCookieOptions() {
  return {
    name: THEME_COOKIE_NAME,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function syncThemeToCookies(theme: ThemeConfig) {
  const cookieStore = await cookies();
  cookieStore.set({
    ...getThemeCookieOptions(),
    value: getThemeCookiePayload(theme),
  });
}

export function syncThemeToResponseCookie(res: NextResponse, theme: ThemeConfig) {
  res.cookies.set({
    ...getThemeCookieOptions(),
    value: getThemeCookiePayload(theme),
  });
}

export async function getStoreConfig() {
  return getStoreConfigCached();
}