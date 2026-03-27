"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, Mail, Globe, Instagram, Twitter, Linkedin } from "lucide-react";
import { useToast } from "./page";

export default function SettingsManagement() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    email: "",
    phone: "",
    address: "",
    formEmail: "",
    socials: {
      instagram: "",
      twitter: "",
      linkedin: ""
    }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Contact Settings
        const contactRes = await fetch('/api/admin/settings/contact');
        const contactData = await contactRes.json();
        if (!contactData.error) setSettings(contactData);

      } catch (err) {
        console.error("Failed to fetch settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Failed to save");
      addToast("Studio settings updated", "success");
    } catch (err) {
      addToast("Failed to update studio settings", "error");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-white tracking-tight">Contact Settings</h2>
          <p className="text-zinc-500 text-sm mt-1">Configure contact page and studio information.</p>
        </div>
      </div>

      <div className="space-y-6">
          <div className="flex items-center justify-end">
            <button
              onClick={handleSaveContact}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Studio Info
            </button>
          </div>

          <form onSubmit={handleSaveContact} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {/* Contact Info Group */}
            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> Contact Details
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Public Email</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={e => setSettings({...settings, email: e.target.value})}
                    placeholder="hello@studio.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Public Phone</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={e => setSettings({...settings, phone: e.target.value})}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Studio Address</label>
                  <textarea
                    value={settings.address}
                    onChange={e => setSettings({...settings, address: e.target.value})}
                    placeholder="Your studio address..."
                    rows={3}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none resize-none"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <label className="text-xs font-medium text-zinc-500">Form Submission Target Email</label>
                  <input
                    type="email"
                    value={settings.formEmail}
                    onChange={e => setSettings({...settings, formEmail: e.target.value})}
                    placeholder="admin@studio.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-400 focus:border-zinc-500 outline-none"
                  />
                  <p className="text-[10px] text-zinc-600">Messages from the contact form will be routed here.</p>
                </div>
              </div>
            </div>

            {/* Socials Group */}
            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Globe size={14} /> Social Presence
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                    <Instagram size={12} /> Instagram URL
                  </label>
                  <input
                    type="url"
                    value={settings.socials.instagram}
                    onChange={e => setSettings({
                      ...settings, 
                      socials: { ...settings.socials, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/yourprofile"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                    <Twitter size={12} /> Twitter / X URL
                  </label>
                  <input
                    type="url"
                    value={settings.socials.twitter}
                    onChange={e => setSettings({
                      ...settings, 
                      socials: { ...settings.socials, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/yourprofile"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
                    <Linkedin size={12} /> LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={settings.socials.linkedin}
                    onChange={e => setSettings({
                      ...settings, 
                      socials: { ...settings.socials, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/company/yourprofile"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </form>
      </div>
    </div>
  );
}
