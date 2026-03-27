import { NextResponse } from "next/server";
import getDatabase from "@/lib/mongodb";
import { isAdminRequest } from "@/lib/auth";
import { invalidateCachePrefix } from "@/lib/multiLayerCache";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "contact_info" as any });
    
    // Default values if not found
    const defaultSettings = {
      email: "hello@photogen.com",
      phone: "+1 (555) 000-0000",
      address: "Studio 42, Visual Arts District\nNew York, NY 10001",
      socials: {
        instagram: "https://instagram.com/photogen",
        twitter: "https://twitter.com/photogen",
        linkedin: "https://linkedin.com/company/photogen"
      },
      formEmail: "submissions@photogen.com"
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
    
    const { email, phone, address, socials, formEmail } = body;

    await db.collection("settings").updateOne(
      { _id: "contact_info" as any },
      { 
        $set: { 
          email, 
          phone, 
          address, 
          socials, 
          formEmail,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );

    invalidateCachePrefix("home:");
    invalidateCachePrefix("contact:");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
