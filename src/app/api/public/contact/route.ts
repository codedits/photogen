import getDatabase from "@/lib/mongodb";
import { noStoreJson } from "@/lib/httpCache";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();

    if (!name || !email || !message) {
      return noStoreJson({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return noStoreJson({ error: "Invalid email" }, { status: 400 });
    }

    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "contact_info" as any });
    const targetEmail =
      typeof (settings as any)?.formEmail === "string" && (settings as any).formEmail.trim().length > 0
        ? (settings as any).formEmail.trim()
        : "submissions@photogen.com";

    // In a real app, you'd send an email here using Resend/SendGrid/etc.
    // For now, log the configured destination to keep the data flow aligned with admin settings.
    console.log("CONTACT FORM SUBMISSION:", { targetEmail, name, email, subject, message });

    // Success response
    return noStoreJson({ ok: true, message: "Message sent! We'll get back to you soon." });
  } catch (error) {
    return noStoreJson({ error: "Failed to send message" }, { status: 500 });
  }
}
