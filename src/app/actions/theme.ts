"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, adminToken } from "@/lib/auth";
import { syncThemeToCookies, updateThemeConfig, type ThemeConfig } from "@/services/config";

type ThemeActionResult =
  | { ok: true; theme: ThemeConfig }
  | { ok: false; error: string };

export async function updateThemeConfigAction(patch: unknown): Promise<ThemeActionResult> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!sessionToken || sessionToken !== adminToken()) {
      return { ok: false, error: "Unauthorized" };
    }

    const nextTheme = await updateThemeConfig(patch);
    await syncThemeToCookies(nextTheme);

    return { ok: true, theme: nextTheme };
  } catch (error) {
    console.error("Theme server action failed:", error);
    return { ok: false, error: "Failed to update theme settings" };
  }
}