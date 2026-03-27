import React from "react";
import getDatabase from "@/lib/mongodb";
import ContactView from "@/components/ContactView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | PhotoGen",
  description: "Get in touch with PhotoGen Studio. Whether you have a question about our work, want to collaborate, or just want to say hi, our inbox is always open.",
};

// Revalidate every 6 hours by default to match the global strategy
export const revalidate = 21600;

async function getContactSettings() {
  try {
    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "contact_info" as any });
    return settings;
  } catch (error) {
    console.error("Failed to fetch contact settings:", error);
    return null;
  }
}

export default async function ContactPage() {
  const settings = await getContactSettings();
  
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

  return (
    <ContactView settings={settings || (defaultSettings as any)} />
  );
}
