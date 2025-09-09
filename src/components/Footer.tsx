"use client";
import React from "react";

export default function Footer() {
  return (
  <footer className="mt-12 border-t border-transparent bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-xl font-semibold mb-3 text-[#782bfd]">PhotoGen</h4>
          <p className="text-sm text-white/90">Create stunning AI-generated images and manage presets for quick reuse. High-quality image outputs with flexible download and management options.</p>
        </div>

        <div>
          <h5 className="font-semibold mb-3 text-[#782bfd]">About</h5>
          <ul className="space-y-2 text-sm text-white/90">
            <li><a href="/about" className="hover:text-white">Our story</a></li>
            <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
            <li><a href="/docs" className="hover:text-white">Docs</a></li>
          </ul>
        </div>

        <div>
          <h5 className="font-semibold mb-3 text-[#782bfd]">Contact</h5>
          <ul className="space-y-2 text-sm text-white/90">
            <li>Email: <a href="mailto:hello@photogen.example" className="hover:text-white">hello@photogen.example</a></li>
            <li>Support: <a href="mailto:support@photogen.example" className="hover:text-white">support@photogen.example</a></li>
            <li>Phone: <a href="tel:+1234567890" className="hover:text-white">+1 (234) 567-890</a></li>
          </ul>
        </div>

        <div>
          <h5 className="font-semibold mb-3 text-[#782bfd]">Follow</h5>
          <div className="flex flex-col gap-3">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="flex items-center gap-3 text-sm text-[#b89dff] hover:text-white">
              <svg className="w-5 h-5 text-violet-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M20 7.5c-.6.3-1.2.5-1.9.6.7-.4 1.2-1 1.4-1.6-.6.4-1.4.7-2.2.9C16.9 6.6 16 6 15 6c-1.8 0-3.2 1.6-2.9 3.3C9.6 9 7.1 7.6 5.7 5.6c-.9 1.5-.4 3.5 1.1 4.5-.5 0-1-.2-1.5-.4v.1c0 1.6 1.1 2.9 2.6 3.2-.4.1-.9.1-1.3.1-.3 0-.6 0-.9-.1.6 2 2.3 3.4 4.3 3.4-1.5 1.2-3.3 1.9-5.3 1.9-.3 0-.6 0-.9-.1C6.8 20.4 9.2 21 11.8 21c7.1 0 11-6 11-11v-.5c.7-.5 1.2-1.2 1.6-2z" fill="currentColor" />
              </svg>
              Twitter
            </a>

            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="flex items-center gap-3 text-sm text-[#b89dff] hover:text-white">
              <svg className="w-5 h-5 text-[#b89dff]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M16 11.5a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M17.5 6.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Instagram
            </a>

            <a href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub" className="flex items-center gap-3 text-sm text-[#b89dff] hover:text-white">
              <svg className="w-5 h-5 text-[#b89dff]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M12 2C8.7 2 6 4.7 6 8c0 2.6 1.7 4.8 4.1 5.6.3.1.4-.1.4-.3v-1.1c-1.7.4-2-.8-2-.8-.3-.8-.8-1-1-1-.8-.5 0-.5 0-.5.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .5-1.3-1.5-.2-3.1-.7-3.1-3 0-.7.3-1.2.8-1.6-.1-.2-.4-1 .1-2 0 0 .7-.2 2.3.8.7-.2 1.5-.3 2.3-.3.8 0 1.6.1 2.3.3 1.6-1 2.3-.8 2.3-.8.5 1.1.2 1.8.1 2 .5.4.8.9.8 1.6 0 2.3-1.6 2.8-3.1 3 .3.3.6.9.6 1.8v2.6c0 .2.1.4.4.3C18.3 12.8 20 10.6 20 8c0-3.3-2.7-6-8-6z" fill="currentColor" />
              </svg>
              GitHub
            </a>

            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="flex items-center gap-3 text-sm text-[#b89dff] hover:text-white">
              <svg className="w-5 h-5 text-[#b89dff]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 8v.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M16 11.5v5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              LinkedIn
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-transparent mt-6">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-xs text-white/60">
          <div>© {new Date().getFullYear()} PhotoGen. All rights reserved.</div>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
