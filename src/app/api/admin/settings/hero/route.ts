import getDatabase from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/auth";
import { invalidateHomeContent } from "@/lib/contentInvalidation";
import { noStoreJson } from "@/lib/httpCache";
import cloudinary from "@/lib/cloudinary";

type HeroMediaRef = {
  url: string;
  public_id: string;
};

type HeroSettingsDoc = {
  introText: string;
  mainHeadline: string;
  image: HeroMediaRef;
  video: HeroMediaRef;
  mediaType: "image" | "video";
  overlayBrightness: number;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
};

const defaultSettings: HeroSettingsDoc = {
  introText: "It's about emotion and clarity. It is the balance between structure and imagination.",
  mainHeadline: "Art Director from Pakistan, working across brand, and campaign. My work is a dialogue between order and chaos.",
  image: {
    url: "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?scale-down-to=1024",
    public_id: "",
  },
  video: {
    url: "",
    public_id: "",
  },
  mediaType: "image",
  overlayBrightness: 0.85,
  ctaText: "Gallery",
  ctaLink: "/gallery",
  secondaryCtaText: "Contact",
  secondaryCtaLink: "/contact",
};

function normalizeMediaRef(value: unknown): HeroMediaRef {
  if (typeof value === "string") {
    return { url: value.trim(), public_id: "" };
  }

  if (!value || typeof value !== "object") {
    return { url: "", public_id: "" };
  }

  const media = value as Record<string, unknown>;
  const url = typeof media.url === "string" ? media.url.trim() : "";
  const publicId = typeof media.public_id === "string" ? media.public_id.trim() : "";
  return { url, public_id: publicId };
}

function normalizeHeroSettings(settings: Record<string, unknown> | null | undefined): HeroSettingsDoc {
  if (!settings) {
    return defaultSettings;
  }

  const image = normalizeMediaRef(settings.image);
  const video = normalizeMediaRef(settings.video);
  const rawMediaType = typeof settings.mediaType === "string" ? settings.mediaType.trim().toLowerCase() : "";
  const mediaType: "image" | "video" =
    rawMediaType === "video" || (rawMediaType !== "image" && !!video.url) ? "video" : "image";

  return {
    introText: typeof settings.introText === "string" ? settings.introText : defaultSettings.introText,
    mainHeadline: typeof settings.mainHeadline === "string" ? settings.mainHeadline : defaultSettings.mainHeadline,
    image: {
      url: image.url || defaultSettings.image.url,
      public_id: image.public_id,
    },
    video,
    mediaType,
    overlayBrightness:
      typeof settings.overlayBrightness === "number" && Number.isFinite(settings.overlayBrightness)
        ? Math.min(1, Math.max(0.1, settings.overlayBrightness))
        : defaultSettings.overlayBrightness,
    ctaText: typeof settings.ctaText === "string" ? settings.ctaText : defaultSettings.ctaText,
    ctaLink: typeof settings.ctaLink === "string" ? settings.ctaLink : defaultSettings.ctaLink,
    secondaryCtaText:
      typeof settings.secondaryCtaText === "string" ? settings.secondaryCtaText : defaultSettings.secondaryCtaText,
    secondaryCtaLink:
      typeof settings.secondaryCtaLink === "string" ? settings.secondaryCtaLink : defaultSettings.secondaryCtaLink,
  };
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "hero_settings" as any });
    return noStoreJson(normalizeHeroSettings(settings as Record<string, unknown> | null));
  } catch (error) {
    return noStoreJson({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return noStoreJson({ error: "Invalid JSON body" }, { status: 400 });
    }

    const db = await getDatabase();
    const currentSettings = await db.collection("settings").findOne(
      { _id: "hero_settings" as any },
      { projection: { image: 1, video: 1 } }
    );

    const previousPublicId = typeof (currentSettings as any)?.image?.public_id === "string"
      ? ((currentSettings as any).image.public_id as string).trim()
      : "";
    const previousVideoPublicId = typeof (currentSettings as any)?.video?.public_id === "string"
      ? ((currentSettings as any).video.public_id as string).trim()
      : "";
    
    // We update only allowed fields from the body
    const allowedFields = [
      'introText', 'mainHeadline', 'image', 'video', 'mediaType', 'overlayBrightness',
      'ctaText', 'ctaLink', 'secondaryCtaText', 'secondaryCtaLink'
    ];
    
    const updateData: any = { updatedAt: new Date() };
    allowedFields.forEach(field => {
      if (body[field] === undefined) {
        return;
      }

      if (field === 'overlayBrightness') {
        const parsed = Number(body[field]);
        if (Number.isFinite(parsed)) {
          updateData[field] = Math.min(1, Math.max(0.1, parsed));
        }
        return;
      }

      if (field === 'mediaType') {
        const mediaType = typeof body[field] === 'string' ? body[field].trim().toLowerCase() : '';
        if (mediaType === 'image' || mediaType === 'video') {
          updateData.mediaType = mediaType;
        }
        return;
      }

      if (field === 'image' || field === 'video') {
        const image = body[field];
        if (image && typeof image === 'object') {
          const img = image as Record<string, unknown>;
          updateData[field] = {
            url: typeof img.url === 'string' ? img.url.trim() : '',
            public_id: typeof img.public_id === 'string' ? img.public_id.trim() : '',
          };
        }
        return;
      }

      if (typeof body[field] === 'string') {
        updateData[field] = body[field].trim();
      }
    });

    await db.collection("settings").updateOne(
      { _id: "hero_settings" as any },
      { $set: updateData },
      { upsert: true }
    );

    const nextPublicId = typeof updateData?.image?.public_id === "string"
      ? (updateData.image.public_id as string).trim()
      : previousPublicId;

    const nextVideoPublicId = typeof updateData?.video?.public_id === "string"
      ? (updateData.video.public_id as string).trim()
      : previousVideoPublicId;

    if (previousPublicId && previousPublicId !== nextPublicId) {
      try {
        await cloudinary.uploader.destroy(previousPublicId, { invalidate: true });
      } catch (cleanupErr) {
        console.error("Failed to cleanup previous hero image:", cleanupErr);
      }
    }

    if (previousVideoPublicId && previousVideoPublicId !== nextVideoPublicId) {
      try {
        await cloudinary.uploader.destroy(previousVideoPublicId, { resource_type: "video", invalidate: true });
      } catch (cleanupErr) {
        console.error("Failed to cleanup previous hero video:", cleanupErr);
      }
    }

    invalidateHomeContent();

    const updatedSettings = await db.collection("settings").findOne({ _id: "hero_settings" as any });
    return noStoreJson({ ok: true, settings: normalizeHeroSettings(updatedSettings as Record<string, unknown> | null) });
  } catch (error) {
    console.error("Hero settings update failed:", error);
    return noStoreJson({ error: "Failed to update settings" }, { status: 500 });
  }
}
