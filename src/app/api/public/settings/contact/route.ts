import { NextResponse } from "next/server";
import getDatabase from "@/lib/mongodb";

export async function GET() {
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
      }
    };

    // Strip internal fields like formEmail for public consumption if needed
    // though it's generally fine to show a public submissions email.
    return NextResponse.json(settings || defaultSettings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch contact info" }, { status: 500 });
  }
}
