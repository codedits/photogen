import { isAdminRequest } from "@/lib/auth";
import { noStoreJson } from "@/lib/httpCache";
import {
  getStoreConfig,
  syncThemeToResponseCookie,
  updateThemeConfig,
} from "@/services/config";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getStoreConfig();
    return noStoreJson({
      theme: config.theme,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    return noStoreJson({ error: "Failed to fetch theme settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return noStoreJson({ error: "Invalid JSON body" }, { status: 400 });
    }

    const nextTheme = await updateThemeConfig((body as any).theme ?? body);

    const res = noStoreJson({ ok: true, theme: nextTheme });
    syncThemeToResponseCookie(res, nextTheme);
    return res;
  } catch (error) {
    console.error("Theme update failed:", error);
    return noStoreJson({ error: "Failed to update theme settings" }, { status: 500 });
  }
}