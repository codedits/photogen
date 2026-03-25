"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2, Mail, MapPin, Globe, Instagram, Twitter, Linkedin, Image as ImageIcon } from "lucide-react";
import { useToast } from "./page";
import RichTextEditor from "./components/RichTextEditor";

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

  const [heroSettings, setHeroSettings] = useState({
    introText: "",
    mainHeadline: "",
    image: {
      url: "",
      public_id: ""
    }
  });

  const [activeTab, setActiveTab] = useState<'studio' | 'hero'>('studio');
  const [heroSaving, setHeroSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Contact Settings
        const contactRes = await fetch('/api/admin/settings/contact');
        const contactData = await contactRes.json();
        if (!contactData.error) setSettings(contactData);

        // Fetch Hero Settings
        const heroRes = await fetch('/api/admin/settings/hero');
        const heroData = await heroRes.json();
        if (!heroData.error) setHeroSettings(heroData);
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

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeroSaving(true);
    try {
      const res = await fetch('/api/admin/settings/hero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroSettings)
      });
      if (!res.ok) throw new Error("Failed to save");
      addToast("Hero section updated", "success");
    } catch (err) {
      addToast("Failed to update hero settings", "error");
    } finally {
      setHeroSaving(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const signatureRes = await fetch('/api/admin/cloudinary-signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folder: 'photogen/hero' }),
      });
      const signatureData = await signatureRes.json();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signatureData.apiKey);
      formData.append('timestamp', String(signatureData.timestamp));
      formData.append('signature', signatureData.signature);
      formData.append('folder', signatureData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await uploadRes.json();

      if (data.secure_url) {
        setHeroSettings(prev => ({
          ...prev,
          image: { url: data.secure_url, public_id: data.public_id }
        }));
        addToast("Hero image uploaded", "success");
      }
    } catch (err) {
      addToast("Image upload failed", "error");
    } finally {
      setUploadingImage(false);
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
          <h2 className="text-2xl font-normal text-white tracking-tight">Settings</h2>
          <p className="text-zinc-500 text-sm mt-1">Configure global site content and studio information.</p>
        </div>
        
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === 'studio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('hero')}
            className={`px-4 py-1.5 text-sm rounded-md transition-all ${activeTab === 'hero' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Hero Section
          </button>
        </div>
      </div>

      {activeTab === 'studio' ? (
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
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
          <div className="flex items-center justify-end">
            <button
              onClick={handleSaveHero}
              disabled={heroSaving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md font-medium hover:bg-white transition-colors disabled:opacity-50"
            >
              {heroSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Update Hero Section
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider">Hero Text Content</h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Intro Quote/Text</label>
                  <RichTextEditor 
                    content={heroSettings.introText}
                    onChange={(content) => setHeroSettings({...heroSettings, introText: content})}
                    placeholder="Subtle text above the headline"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Main Headline</label>
                  <RichTextEditor 
                    content={heroSettings.mainHeadline}
                    onChange={(content) => setHeroSettings({...heroSettings, mainHeadline: content})}
                    placeholder="The main statement on the home page"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
              <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                Hero Image
                {uploadingImage && <Loader2 size={14} className="animate-spin text-zinc-500" />}
              </h3>

              <div className="relative aspect-[3/4] w-full max-w-[240px] mx-auto rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group">
                {heroSettings.image.url ? (
                  <>
                    <img 
                      src={heroSettings.image.url} 
                      alt="Hero preview" 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <label className="cursor-pointer bg-white text-black text-[10px] px-3 py-1.5 rounded-full font-medium active:scale-95 transition-transform">
                          Change Image
                          <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
                       </label>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <ImageIcon className="text-zinc-800" size={32} />
                    <label className="cursor-pointer bg-zinc-800 text-zinc-300 text-[10px] px-3 py-1.5 rounded-full font-medium hover:bg-zinc-700 transition-colors">
                        Upload Image
                        <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
                    </label>
                  </div>
                )}
                
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">Recommended: Portrait 3:4 aspect ratio</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
