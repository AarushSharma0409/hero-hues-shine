import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Send, FileText, ChevronRight, Home, FileStack, Layers, Scissors, Settings, Bell, MessageSquare, Plus, Image as ImageIcon, Paperclip, Smile, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DocMind — Ask Anything. Cite Everything." },
      { name: "description", content: "Upload your documents. Get answers with exact source citations." },
    ],
  }),
  component: Index,
});

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

const API_BASE =
  (import.meta.env.VITE_DOCMIND_API_BASE as string | undefined) ??
  "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { label: "Home", icon: Home },
  { label: "Documents", icon: FileStack, active: true },
  { label: "Documents", icon: FileStack },
  { label: "Shaders", icon: Layers },
  { label: "Cutting", icon: Scissors },
  { label: "Settings", icon: Settings },
];

function useVideoFadeLoop() {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const FADE = 500;
    let raf = 0;
    const tick = () => {
      if (!video.duration || Number.isNaN(video.duration)) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = video.currentTime;
      const d = video.duration;
      let op = 1;
      if (t < FADE / 1000) op = t / (FADE / 1000);
      else if (t > d - FADE / 1000) op = Math.max(0, (d - t) / (FADE / 1000));
      video.style.opacity = String(op);
      raf = requestAnimationFrame(tick);
    };
    const onEnded = () => {
      video.style.opacity = "0";
      window.setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };
    video.style.opacity = "0";
    video.play().catch(() => {});
    raf = requestAnimationFrame(tick);
    video.addEventListener("ended", onEnded);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("ended", onEnded);
    };
  }, []);
  return ref;
}

type Doc = { id: string; name: string; size: number };
type Citation = { source: string; page?: number | string };
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: "high" | "medium" | "low";
  citations?: Citation[];
};

function Index() {
  const videoRef = useVideoFadeLoop();

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0 }}
        />
        <div className="absolute inset-0 bg-[#0a0714]/70" />
        <div className="pointer-events-none absolute -left-32 top-1/3 h-[480px] w-[480px] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <main className="relative z-10 h-full p-4 md:p-6">
        <div className="mx-auto grid h-full max-w-[1400px] grid-cols-1 gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <Sidebar />
          <ChatSection />
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight">DocMind</span>
        </div>
      </div>

      <button className="mt-5 w-full rounded-xl bg-gradient-to-b from-[#6366f1] to-[#4f46e5] px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7)] hover:brightness-110 transition">
        New chat
      </button>

      <nav className="mt-5 flex-1 space-y-1">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={i}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              item.active
                ? "bg-white/[0.06] text-white ring-1 ring-white/10"
                : "text-foreground/60 hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <button className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/[0.06] transition">
        Documents
      </button>
    </aside>
  );
}

function UploadSection() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const onHighlight = (e: Event) => {
      const sources = ((e as CustomEvent).detail?.sources ?? []) as string[];
      const norm = (s: string) => s.toLowerCase().split(/[\\/]/).pop()!.trim();
      const wanted = sources.map(norm);
      const matchedIds = docs
        .filter((d) => wanted.includes(norm(d.name)))
        .map((d) => d.id);
      setHighlighted(matchedIds);
      if (matchedIds[0]) {
        cardRefs.current[matchedIds[0]]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    };
    const onClear = () => setHighlighted([]);
    window.addEventListener("docmind:highlight", onHighlight);
    window.addEventListener("docmind:highlight-clear", onClear);
    return () => {
      window.removeEventListener("docmind:highlight", onHighlight);
      window.removeEventListener("docmind:highlight-clear", onClear);
    };
  }, [docs]);

  useEffect(() => {
    fetch(`${API_BASE}/documents/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list: Doc[] = Array.isArray(data)
          ? data.map((d: any, i: number) => ({
              id: String(d.id ?? d._id ?? d.name ?? i),
              name: d.filename ?? d.name ?? `document-${i}`,
              size: Number(d.size ?? 0),
            }))
          : [];
        if (list.length) setDocs(list);
      })
      .catch(() => {});
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/documents/upload`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.statusText)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(form);
      });
      setDocs((d) => [...d, { id, name: file.name, size: file.size }]);
    } catch {
      setDocs((d) => [...d, { id, name: file.name, size: file.size }]);
    } finally {
      setTimeout(() => setProgress(null), 600);
    }
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-slate-900/15 backdrop-blur-[2px] p-6">
      <div>
        <h2 className="font-display text-2xl text-foreground" style={{ letterSpacing: "-0.02em" }}>
          Documents
        </h2>
        <p className="mt-1 text-sm text-foreground/60">PDF, DOCX, or TXT. Drag and drop or click to browse.</p>
      </div>

        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          animate={dragOver ? { scale: 1.02 } : { scale: 1 }}
          className={cn(
            "mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all",
            "bg-slate-900/30 backdrop-blur-sm",
            dragOver
              ? "border-violet-400 shadow-[0_0_60px_rgba(139,92,246,0.5)] animate-pulse"
              : "border-slate-700 hover:border-violet-500/60 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="mx-auto h-10 w-10 text-violet-400" />
          <p className="mt-3 text-base text-foreground">Drop files here or click to upload</p>
          <p className="mt-1 text-xs text-foreground/60">Up to 25MB per file</p>
        </motion.div>

        {progress !== null && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        )}

        <div className="mt-6 flex-1 space-y-3 overflow-y-auto pr-1">
          <AnimatePresence>
            {docs.map((doc) => (
              <motion.div
                key={doc.id}
                ref={(el) => { cardRefs.current[doc.id] = el; }}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "flex items-center justify-between rounded-xl border bg-slate-800/60 backdrop-blur-sm p-3 transition-all duration-300",
                  highlighted.includes(doc.id)
                    ? "border-violet-400/80 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.45)] ring-1 ring-violet-400/40"
                    : "border-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-violet-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                    {doc.size > 0 && (
                      <p className="text-xs text-foreground/60">{(doc.size / 1024).toFixed(1)} KB</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDocs((d) => d.filter((x) => x.id !== doc.id))}
                  className="rounded-lg p-2 text-foreground/60 hover:bg-slate-700 hover:text-rose-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {docs.length === 0 && (
            <p className="pt-8 text-center text-sm text-foreground/40">No documents yet.</p>
          )}
        </div>
    </div>
  );
}

function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/query/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      const conf: "high" | "medium" | "low" =
        typeof data.confidence === "number"
          ? data.confidence >= 0.75 ? "high" : data.confidence >= 0.4 ? "medium" : "low"
          : (data.confidence ?? "medium");
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer ?? data.response ?? "No answer returned.",
        confidence: conf,
        citations: data.citations ?? [],
      }]);
    } catch {
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Could not reach the backend at " + API_BASE + ". Make sure it's running.",
        confidence: "low",
        citations: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">Chat</h2>
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-foreground/60 hover:bg-white/[0.06] hover:text-foreground transition">
            <MessageSquare className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-foreground/60 hover:bg-white/[0.06] hover:text-foreground transition">
            <Bell className="h-4 w-4" />
          </button>
          <button className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#6366f1] to-[#4f46e5] px-3 py-1.5 text-xs font-medium text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.7)] hover:brightness-110 transition">
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto p-6">
            {messages.length === 0 && !loading && (
              <div className="m-auto text-center text-foreground/50">
                <p>Ask a question about your uploaded documents.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </AnimatePresence>
            {loading && <TypingIndicator />}
            <div ref={endRef} />
      </div>

      <div className="m-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write a message…"
          className="w-full bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1 text-foreground/50">
            <button className="rounded-md p-1.5 hover:bg-white/[0.06] hover:text-foreground transition"><ImageIcon className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-white/[0.06] hover:text-foreground transition"><Paperclip className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-white/[0.06] hover:text-foreground transition"><Smile className="h-4 w-4" /></button>
            <button className="rounded-md p-1.5 hover:bg-white/[0.06] hover:text-foreground transition"><MoreHorizontal className="h-4 w-4" /></button>
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#6366f1] to-[#4f46e5] text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-gradient-to-b from-[#7c75f5] to-[#6366f1] text-white shadow-[0_8px_24px_-12px_rgba(99,102,241,0.8)]"
            : "bg-white/[0.04] border border-white/10 text-foreground backdrop-blur-md"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {!isUser && message.confidence && (
          <div className="mt-3 flex items-center gap-2">
            <ConfidenceBadge level={message.confidence} />
          </div>
        )}
        {!isUser && message.citations && message.citations.length > 0 && (
          <Citations citations={message.citations} />
        )}
      </div>
    </motion.div>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cls = {
    high: "bg-emerald-400/15 text-emerald-400 border-emerald-400/40",
    medium: "bg-amber-400/15 text-amber-400 border-amber-400/40",
    low: "bg-rose-400/15 text-rose-400 border-rose-400/40",
  }[level];
  const label = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" }[level];
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: [0.9, 1.08, 1], opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full",
        level === "high" ? "bg-emerald-400" : level === "medium" ? "bg-amber-400" : "bg-rose-400"
      )} />
      {label}
    </motion.span>
  );
}

function Citations({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      window.dispatchEvent(
        new CustomEvent("docmind:highlight", {
          detail: { sources: citations.map((c) => c.source) },
        })
      );
    } else {
      window.dispatchEvent(new CustomEvent("docmind:highlight-clear"));
    }
  }, [open, citations]);
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent("docmind:highlight-clear"));
    };
  }, []);
  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-flex"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </motion.span>
        <span>
          {citations.length} source{citations.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/40 group-hover:text-foreground/60">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-1.5">
              {citations.map((c, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.25 }}
                  className="flex items-center gap-2 rounded-md border border-white/5 bg-slate-900/40 px-2.5 py-1.5 text-xs text-foreground/85 hover:border-violet-400/30 hover:bg-slate-900/60 transition-colors"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/15 text-[10px] font-semibold text-violet-300">
                    {i + 1}
                  </span>
                  <FileText className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                  <span className="truncate font-medium">{c.source}</span>
                  {c.page != null && (
                    <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground/70">
                      p. {c.page}
                    </span>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-violet-400"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
