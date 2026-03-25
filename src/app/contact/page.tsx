"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Instagram, Twitter, Linkedin, Send, Loader2, CheckCircle } from "lucide-react";
import LiquidRiseCTA from "@/components/LiquidRiseCTA";

export default function ContactPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [formState, setFormState] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/public/settings/contact')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState)
      });
      if (res.ok) {
        setStatus('success');
        setFormState({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background font-sans selection:bg-foreground selection:text-background overflow-x-hidden relative">
      {/* Cinematic Background Image */}
      <div className="fixed inset-0 z-0">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img 
            src="https://framerusercontent.com/images/8JG9l1vs1T358YK5DGjMZHom0A.jpeg?width=1600&height=2000" 
            alt="" 
            className="w-full h-full object-cover grayscale-[0.5] contrast-[1.2]"
          />
        </motion.div>
        {/* Gradients for depth and readability */}
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
      </div>

      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-[1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          
          {/* Left Column: Content */}
          <div className="space-y-12">
            <div className="space-y-6">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-8xl font-normal tracking-tighter text-foreground leading-[0.85]"
              >
                Let&apos;s <br />
                <span className="text-muted-foreground/60">Connect.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-muted-foreground max-w-md leading-relaxed"
              >
                Whether you have a question about our work, want to collaborate, or just want to say hi, my inbox is always open.
              </motion.p>
            </div>

            <div className="space-y-8 pt-8 border-t border-border">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <Mail size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-normal uppercase tracking-widest text-muted-foreground mb-1">Email</p>
                    <a href={`mailto:${settings?.email}`} className="text-lg text-foreground hover:text-muted-foreground transition-colors">
                      {settings?.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <Phone size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-normal uppercase tracking-widest text-muted-foreground mb-1">Phone</p>
                    <p className="text-lg text-foreground">{settings?.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <MapPin size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-normal uppercase tracking-widest text-muted-foreground mb-1">Studio</p>
                    <p className="text-lg text-foreground whitespace-pre-line">{settings?.address}</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-4 pt-4">
                {settings?.socials?.instagram && (
                  <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" 
                     className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border hover:border-foreground transition-all text-muted-foreground hover:text-foreground">
                    <Instagram size={18} />
                  </a>
                )}
                {settings?.socials?.twitter && (
                  <a href={settings.socials.twitter} target="_blank" rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border hover:border-foreground transition-all text-muted-foreground hover:text-foreground">
                    <Twitter size={18} />
                  </a>
                )}
                {settings?.socials?.linkedin && (
                  <a href={settings.socials.linkedin} target="_blank" rel="noopener noreferrer"
                     className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border border-border hover:border-foreground transition-all text-muted-foreground hover:text-foreground">
                    <Linkedin size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card/50 p-8 md:p-12 rounded-3xl border border-border backdrop-blur-xl relative overflow-hidden"
          >
            {status === 'success' ? (
              <div className="py-20 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-normal text-foreground tracking-tight">Message Sent!</h2>
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-8 py-3 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors text-sm font-normal uppercase tracking-widest"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={formState.name}
                      onChange={e => setFormState({...formState, name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full bg-transparent border-b border-border py-3 text-foreground focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={formState.email}
                      onChange={e => setFormState({...formState, email: e.target.value})}
                      placeholder="john@example.com"
                      className="w-full bg-transparent border-b border-border py-3 text-foreground focus:border-foreground outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">Subject</label>
                  <input 
                    required
                    type="text" 
                    value={formState.subject}
                    onChange={e => setFormState({...formState, subject: e.target.value})}
                    placeholder="Inquiry about..."
                    className="w-full bg-transparent border-b border-border py-3 text-foreground focus:border-foreground outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground">Message</label>
                  <textarea 
                    required
                    rows={4}
                    value={formState.message}
                    onChange={e => setFormState({...formState, message: e.target.value})}
                    placeholder="Tell us about your project..."
                    className="w-full bg-transparent border-b border-border py-3 text-foreground focus:border-foreground outline-none transition-colors resize-none"
                  />
                </div>

                <LiquidRiseCTA 
                  type="submit" 
                  disabled={status === 'sending'}
                  className="w-full !rounded-xl"
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message'}
                </LiquidRiseCTA>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
