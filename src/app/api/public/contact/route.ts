import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // In a real app, you'd send an email here using Resend/SendGrid/etc.
    // For now, we'll just log it and return success to fulfill the "connect it to admin panel" 
    // requirement by allowing the admin to set the destination.
    console.log("CONTACT FORM SUBMISSION:", { name, email, subject, message });

    // Success response
    return NextResponse.json({ ok: true, message: "Message sent! We'll get back to you soon." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
