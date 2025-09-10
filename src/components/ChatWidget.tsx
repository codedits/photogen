"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { MessageSquare, X } from "lucide-react";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const API_BASE = "https://api.paxsenix.biz.id/v1/gpt-4o/chat";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Always show online status (green dot)
  const online = true;
  const [messages, setMessages] = useState<Msg[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      // If we're on the homepage and the navigation was a reload, empty the chat
      const isHomepage = typeof window !== "undefined" && window.location.pathname === "/";
      let isReload = false;
      try {
        const perf = performance as unknown as {
          getEntriesByType?: (type: string) => PerformanceEntry[];
          navigation?: { type?: number };
        };
  const navEntries = (perf.getEntriesByType?.("navigation") || []) as PerformanceNavigationTiming[];
  if (navEntries[0] && navEntries[0].type === "reload") isReload = true;
        // fallback for older API
        if (!isReload && perf.navigation && perf.navigation.type === 1) isReload = true;
      } catch {}

      if (isHomepage && isReload) {
        try {
          localStorage.removeItem("photogen_chat_history");
        } catch {}
        setMessages([
          { id: uid(), role: "assistant", text: "I am PhotoGen — an AI assistant for photographers. I help with camera settings, composition, editing tips, and workflow advice." },
        ]);
        return;
      }

      const raw = localStorage.getItem("photogen_chat_history");
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}

    setMessages([
      { id: uid(), role: "assistant", text: "I am PhotoGen — an AI assistant for photographers. I help with camera settings, composition, editing tips, and workflow advice." },
    ]);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("photogen_chat_history", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (!listRef.current) return;
    const t = setTimeout(() => {
      try {
        listRef.current!.scrollTo({ top: listRef.current!.scrollHeight, behavior: "smooth" });
      } catch {}
    }, 40);
    return () => clearTimeout(t);
  }, [messages, open]);

  async function send(text: string) {
    if (!text.trim()) return;
    const user: Msg = { id: uid(), role: "user", text };
    setMessages((s) => [...s, user]);
    setInput("");
    setLoading(true);

    try {
      // Build history and ensure we respect the API 1000-character limit
  const MAX_API_CHARS = 1000;
  const HISTORY_WINDOW = 12; // start with recent messages
  const recent = [...messages].slice(-HISTORY_WINDOW);

      const systemPrefix = "You are PhotoGen, an AI assistant for photographers. Answer concisely.\nConversation:\n";

      // Helper that builds composed string from parts and trims oldest parts until within limit
      function buildComposed(parts: string[]) {
        let composed = systemPrefix + parts.join("\n");
        while (composed.length > MAX_API_CHARS && parts.length > 1) {
          // remove oldest context line (shift)
          parts.shift();
          composed = systemPrefix + parts.join("\n");
        }

        // If still too long, truncate the user's message (keep the tail)
        if (composed.length > MAX_API_CHARS) {
          const userLineIndex = parts.length - 1;
          const userLine = parts[userLineIndex] || ""; // e.g. 'User: ...'
          const prefixForUser = userLine.startsWith("User:") ? "User: " : "";
          const available = MAX_API_CHARS - (systemPrefix.length + parts.slice(0, -1).join("\n").length + (parts.length > 1 ? 1 : 0) + prefixForUser.length);
          const rawUser = userLine.replace(/^User:\s*/, "");
          const truncated = available > 0 ? rawUser.slice(-available) : rawUser.slice(-200);
          parts[userLineIndex] = `${prefixForUser}${truncated}`;
          composed = systemPrefix + parts.join("\n");
        }

        return composed;
      }

      const initialParts = recent.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`);
      initialParts.push(`User: ${text}`);
      const composed = buildComposed([...initialParts]);

      // Use the composed string (guaranteed <= MAX_API_CHARS by buildComposed)
      const url = `${API_BASE}?text=${encodeURIComponent(composed)}`;
      const res = await fetch(url, { method: "GET" });

      let botText = "";

      if (!res.ok) {
        const respText = await res.text().catch(() => "");
        console.warn("Chat API GET returned non-OK:", res.status, respText);

        // POST fallback (still send the composed, trimmed payload)
        try {
          const postRes = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: composed }),
          });

          if (!postRes.ok) {
            const postBody = await postRes.text().catch(() => "");
            throw new Error(`GET ${res.status}: ${respText || res.statusText}; POST ${postRes.status}: ${postBody || postRes.statusText}`);
          }

          const pCt = postRes.headers.get("content-type") || "";
          if (pCt.includes("application/json")) {
            const json = await postRes.json();
            botText = json?.reply || json?.response || json?.message || JSON.stringify(json);
          } else {
            botText = await postRes.text();
          }
        } catch (postErr) {
          throw new Error(`GET ${res.status}: ${respText || res.statusText}; POST fallback error: ${String(postErr)}`);
        }
      } else {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const json = await res.json();
          botText = json?.reply || json?.response || json?.message || JSON.stringify(json);
        } else {
          botText = await res.text();
        }
      }

      const bot: Msg = { id: uid(), role: "assistant", text: String(botText) };
      setMessages((s) => [...s, bot]);
    } catch (_err) {
      console.error("Chat send error:", _err);
      setMessages((s) => [...s, { id: uid(), role: "assistant", text: `Error: ${String(_err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  // Simple renderer: converts **bold** into a <strong> element.
  // Keeps other text as plain strings. Lightweight and safe.
  function renderBold(text: string) {
    const out: Array<string | ReactNode> = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(
        <strong key={`b-${i++}`} className="font-semibold">
          {m[1]}
        </strong>
      );
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {open && (
        <div className="md:hidden fixed inset-x-0 bottom-16 flex justify-center px-4 pointer-events-auto">
          <div className="w-full max-w-[420px] bg-black/65 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col box-border max-h-[85vh] min-h-[340px]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">PhotoGen Chat</h3>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-500'} ${online ? 'animate-pulse' : ''}`} aria-hidden />
                  <span>{online ? 'Online' : 'Offline'}</span>
                </div>
              <button aria-label="Close" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-4 pb-4 scrollbar-thin scrollbar-thumb-violet-500/60">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div className={`inline-block max-w-[86%] px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${m.role === "user" ? "bg-violet-600 text-white ml-auto" : "bg-white/6 text-white"}`}>
                    {renderBold(m.text)}
                  </div>
                </div>
              ))}
              {/* typing indicator when assistant is generating a reply */}
              {loading && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 rounded-lg bg-white/6 text-white">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-white/60" style={{ animationDelay: '0s' }} />
                      <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.12s' }} />
                      <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '0.24s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="mt-3 flex gap-2"
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a question" className="flex-1 px-3 py-2 rounded-md bg-white/5 text-white placeholder-white/60 border border-white/10" />
              <button className="bg-violet-600 px-3 py-2 rounded-md text-white" disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}

  <div className="absolute bottom-6 right-6 flex flex-col items-end pointer-events-auto">
        {open && (
          <div className="hidden md:flex w-[360px] max-w-[92vw] flex-col bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl text-sm text-white max-h-[85vh] box-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">PhotoGen Chat</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-gray-500'} ${online ? 'animate-pulse' : ''}`} aria-hidden />
                  <span>{online ? 'Online' : 'Offline'}</span>
                </div>
                <button aria-label="Close" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 pr-4 pb-4 scrollbar-thin scrollbar-thumb-violet-500/60">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div className={`inline-block max-w-[84%] px-3 py-1.5 rounded-md whitespace-pre-wrap break-words ${m.role === "user" ? "bg-violet-600 text-white ml-auto" : "bg-white/6 text-white"}`}>
                    {renderBold(m.text)}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="mt-3 flex gap-2"
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a question" className="flex-1 px-3 py-1.5 rounded-md bg-white/5 text-white placeholder-white/60 border border-white/10" />
              <button className="bg-violet-600 px-3 py-1.5 rounded-md text-white" disabled={loading}>
                {loading ? "..." : "Send"}
              </button>
            </form>
          </div>
        )}

  <button aria-label="Open chat" onClick={() => setOpen((v) => !v)} className="h-14 w-14 rounded-full chat-widget-button text-white flex items-center justify-center shadow-lg">
          <MessageSquare size={20} />
          {/* online badge on the button */}
          <span className={`absolute -top-1 -right-1 inline-block w-3 h-3 rounded-full ${online ? 'bg-emerald-400 animate-pulse ring-2 ring-black' : 'bg-gray-600 ring-2 ring-black'}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}

