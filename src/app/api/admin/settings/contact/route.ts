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

    if (!settings) {
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json({
      email: typeof (settings as any).email === 'string' ? (settings as any).email : defaultSettings.email,
      phone: typeof (settings as any).phone === 'string' ? (settings as any).phone : defaultSettings.phone,
      address: typeof (settings as any).address === 'string' ? (settings as any).address : defaultSettings.address,
      formEmail: typeof (settings as any).formEmail === 'string' ? (settings as any).formEmail : defaultSettings.formEmail,
      socials: {
        instagram: typeof (settings as any)?.socials?.instagram === 'string' ? (settings as any).socials.instagram : defaultSettings.socials.instagram,
        twitter: typeof (settings as any)?.socials?.twitter === 'string' ? (settings as any).socials.twitter : defaultSettings.socials.twitter,
        linkedin: typeof (settings as any)?.socials?.linkedin === 'string' ? (settings as any).socials.linkedin : defaultSettings.socials.linkedin,
      },
    });
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

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const formEmail = typeof body?.formEmail === 'string' ? body.formEmail.trim() : '';
    const socials = {
      instagram: typeof body?.socials?.instagram === 'string' ? body.socials.instagram.trim() : '',
      twitter: typeof body?.socials?.twitter === 'string' ? body.socials.twitter.trim() : '',
      linkedin: typeof body?.socials?.linkedin === 'string' ? body.socials.linkedin.trim() : '',
    };

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
