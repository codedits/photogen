import { NextResponse } from "next/server";
import getDatabase from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { invalidateCachePrefix } from "@/lib/multiLayerCache";
import cloudinary from "@/lib/cloudinary";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "hero_settings" as any });
    
    // Default values if not found
    const defaultSettings = {
      introText: "It's about emotion and clarity. It is the balance between structure and imagination.",
      mainHeadline: "Art Director from Pakistan, working across brand, and campaign. My work is a dialogue between order and chaos.",
      image: {
        url: "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?scale-down-to=1024",
        public_id: ""
      },
      overlayBrightness: 0.85,
      ctaText: "Gallery",
      ctaLink: "/gallery",
      secondaryCtaText: "Contact",
      secondaryCtaLink: "/contact"
    };

    return NextResponse.json(settings || defaultSettings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const db = await getDatabase();
    const currentSettings = await db.collection("settings").findOne(
      { _id: "hero_settings" as any },
      { projection: { image: 1 } }
    );
    const previousPublicId = typeof (currentSettings as any)?.image?.public_id === "string"
      ? ((currentSettings as any).image.public_id as string).trim()
      : "";
    
    // We update only allowed fields from the body
    const allowedFields = [
      'introText', 'mainHeadline', 'image', 'overlayBrightness',
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

      if (field === 'image') {
        const image = body[field];
        if (image && typeof image === 'object') {
          const img = image as Record<string, unknown>;
          updateData.image = {
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

    if (previousPublicId && previousPublicId !== nextPublicId) {
      try {
        await cloudinary.uploader.destroy(previousPublicId, { invalidate: true });
      } catch (cleanupErr) {
        console.error("Failed to cleanup previous hero image:", cleanupErr);
      }
    }

    invalidateCachePrefix("home:");
    // Trigger on-demand revalidation for the home page
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Hero settings update failed:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
