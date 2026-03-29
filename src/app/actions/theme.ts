"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import getDatabase from "@/lib/mongodb";
import { adminToken } from "@/lib/auth";
import { getStoreConfig, mergeThemeConfig, syncThemeToCookies, type ThemeConfig } from "@/services/config";

type ThemeActionResult =
  | { ok: true; theme: ThemeConfig }
  | { ok: false; error: string };

export async function updateThemeConfigAction(patch: unknown): Promise<ThemeActionResult> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("pg_admin")?.value;

    if (!sessionToken || sessionToken !== adminToken()) {
      return { ok: false, error: "Unauthorized" };
    }

    const current = await getStoreConfig();
    const nextTheme = mergeThemeConfig(current.theme, patch);

    const db = await getDatabase();
    await db.collection("settings").updateOne(
      { _id: "theme_tokens" as any },
      {
        $set: {
          theme: nextTheme,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    revalidateTag("site_config", "max");
    revalidatePath("/", "layout");
    revalidatePath("/");
    await syncThemeToCookies(nextTheme);

    return { ok: true, theme: nextTheme };
  } catch (error) {
    console.error("Theme server action failed:", error);
    return { ok: false, error: "Failed to update theme settings" };
  }
}