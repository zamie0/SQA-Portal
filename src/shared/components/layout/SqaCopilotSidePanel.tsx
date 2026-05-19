"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/shared/lib/chat-types";
import { useLiveTranscription } from "@/shared/hooks/use-live-transcription";
import { Loader2, MessageCircle, Mic, Send, Sparkles, Square, Wand2, X } from "lucide-react";

type SidePanelMessage = ChatMessage & {
  id: string;
  pending?: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function readPageContext(path: string) {
  if (typeof document === "undefined") {
    return `Current page: ${path}`;
  }

  const mainText = document.querySelector("main")?.textContent ?? document.body.textContent ?? "";
  return `Current page: ${path}

Visible page content:
${mainText.replace(/\s+/g, " ").trim().slice(0, 8_000) || "No visible page text captured."}`;
}

export function SqaCopilotSidePanel({ disabled = false }: { disabled?: boolean }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SidePanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const {
    listening,
    error: transcriptionError,
    toggle: toggleTranscription,
    stop: stopTranscription,
  } = useLiveTranscription({
    value: input,
    onChange: setInput,
  });

  const suggestions = useMemo(
    () => [
      "Summarize this page",
      "Find QA risks",
      "Suggest next actions",
      "Explain what I can do here",
    ],
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (transcriptionError) setError(transcriptionError);
  }, [transcriptionError]);

  async function sendPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;

    stopTranscription();
    setInput("");
    setError("");
    setSending(true);

    const userMessage: SidePanelMessage = { id: uid(), role: "user", content: trimmed };
    const pending: SidePanelMessage = { id: uid(), role: "assistant", content: "", pending: true };
    setMessages((current) => [...current, userMessage, pending]);

    const pageContext = readPageContext(path);
    const priorMessages: ChatMessage[] = messages
      .filter((message) => !message.pending)
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content }));
    const history: ChatMessage[] = [
      ...priorMessages,
      {
        role: "user",
        content: `${pageContext}

You are the SQA Copilot side panel for SQA Portal. Help the user understand the current page, analyze QA work, identify risks, and suggest practical next steps. Keep responses concise and grounded in the visible page context.

User request: ${trimmed}`,
      },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { reply?: string };

      setMessages((current) =>
        current.map((message) =>
          message.id === pending.id
            ? {
                ...message,
                content: data.reply?.trim() || "I could not generate a response.",
                pending: false,
              }
            : message,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "SQA Copilot side panel failed.";
      setError(message);
      setMessages((current) => current.filter((item) => item.id !== pending.id));
    } finally {
      setSending(false);
    }
  }

  if (disabled) return null;

  return (
    <>
      {open ? (
        <aside className="fixed bottom-6 right-6 top-6 z-40 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl animate-in slide-in-from-right-4 fade-in-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">SQA Copilot</h2>
                <p className="text-xs text-muted-foreground">Context-aware side panel</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
              title="Close SQA Copilot"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                  <Wand2 className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">Ask about this page</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Copilot can read the visible page context and help with QA risks, summaries, and
                  next actions.
                </p>
                <div className="mt-3 grid gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendPrompt(suggestion)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={[
                    "rounded-2xl px-3 py-2.5 text-sm",
                    message.role === "user"
                      ? "ml-8 bg-foreground text-background"
                      : "mr-8 border border-slate-200 bg-slate-50",
                  ].join(" ")}
                >
                  {message.pending ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  ) : message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendPrompt(input);
            }}
            className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-2"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendPrompt(input);
                }
              }}
              placeholder="Ask SQA Copilot about this page..."
              rows={3}
              disabled={sending}
              className="max-h-28 w-full resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  toggleTranscription();
                }}
                disabled={sending}
                title={listening ? "Stop live transcription" : "Start live transcription"}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-45",
                  listening
                    ? "bg-destructive/15 text-destructive"
                    : "text-muted-foreground hover:bg-white hover:text-foreground",
                ].join(" ")}
              >
                {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {listening ? "Listening" : "Voice"}
              </button>
              <button
                type="submit"
                disabled={!input.trim() || sending || listening}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[image:var(--gradient-primary)] px-3 py-2 text-xs font-semibold text-white shadow-md disabled:pointer-events-none disabled:opacity-45"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </div>
            <div className="mt-1 px-2 text-[10px] text-muted-foreground">
              {listening ? "Listening live... your speech appears in the prompt box." : null}
            </div>
          </form>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-primary/30 ring-1 ring-white/40 transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/25"
        >
          <span className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 transition group-hover:opacity-100" />
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 shadow-inner">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block">SQA Copilot</span>
            <span className="block text-[10px] font-medium text-white/80">AI side panel</span>
          </span>
        </button>
      )}
    </>
  );
}
