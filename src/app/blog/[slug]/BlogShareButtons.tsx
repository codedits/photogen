"use client";

import React, { useCallback, useState, useEffect } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

interface BlogShareButtonsProps {
  title: string;
}

export default function BlogShareButtons({ title }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Detect native share capability after hydration
  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleShareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.href,
        });
      } catch {
        // User cancelled or not supported
      }
    }
  }, [title]);

  const shareToX = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    window.open(`https://x.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  }, [title]);

  const shareToFacebook = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Copy link */}
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
        title="Copy link"
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      {/* X / Twitter */}
      <button
        onClick={shareToX}
        className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
        title="Share on X"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      {/* Facebook */}
      <button
        onClick={shareToFacebook}
        className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
        title="Share on Facebook"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* Native share (mobile) */}
      {canNativeShare && (
        <button
          onClick={handleShareNative}
          className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
          title="Share"
        >
          <Share2 size={12} />
        </button>
      )}
    </div>
  );
}
