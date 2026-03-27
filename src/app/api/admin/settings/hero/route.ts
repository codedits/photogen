import { NextResponse } from "next/server";
import getDatabase from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
    
    // We update only allowed fields from the body
    const allowedFields = [
      'introText', 'mainHeadline', 'image', 'overlayBrightness',
      'ctaText', 'ctaLink', 'secondaryCtaText', 'secondaryCtaLink'
    ];
    
    const updateData: any = { updatedAt: new Date() };
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    await db.collection("settings").updateOne(
      { _id: "hero_settings" as any },
      { $set: updateData },
      { upsert: true }
    );

    // Trigger on-demand revalidation for the home page
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Hero settings update failed:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
