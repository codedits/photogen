import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import getDatabase from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/auth";
import {
  getStoreConfig,
  mergeThemeConfig,
  syncThemeToResponseCookie,
} from "@/services/config";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getStoreConfig();
    return NextResponse.json({
      theme: config.theme,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch theme settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const current = await getStoreConfig();
    const nextTheme = mergeThemeConfig(current.theme, (body as any).theme ?? body);

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

    const res = NextResponse.json({ ok: true, theme: nextTheme });
    syncThemeToResponseCookie(res, nextTheme);
    return res;
  } catch (error) {
    console.error("Theme update failed:", error);
    return NextResponse.json({ error: "Failed to update theme settings" }, { status: 500 });
  }
}