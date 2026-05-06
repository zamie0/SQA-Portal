"use client";

import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  GraduationCap,
  Plus,
  Trash2,
  Pencil,
  MessagesSquare,
  Check,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/chat-server";
import { useLocalStorage } from "@/state";

const SUGGESTIONS = [
  "How do I create my first test automation project?",
  "What's the difference between Test Automation and RPA?",
  "Show me how to schedule a nightly suite",
  "How do I link a test case to an API endpoint?",
];

interface UiMessage extends ChatMessage {
  id: string;
  pending?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  messages: UiMessage[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newConversation(): Conversation {
  return { id: uid(), title: "New chat", createdAt: Date.now(), messages: [] };
}

function ChatPage() {
  const [conversations, setConversations] = useLocalStorage<Conversation[]>("qe-hub.ai-chats.v1", [
    newConversation(),
  ]);
  const [activeId, setActiveId] = useLocalStorage<string>(
    "qe-hub.ai-chats.active.v1",
    conversations[0]?.id ?? "",
  );

  // ensure there's always at least one chat and active id is valid
  useEffect(() => {
    if (conversations.length === 0) {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    } else if (!conversations.find((c) => c.id === activeId)) {
      setActiveId(conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, sending]);

  function patchActive(fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? fn(c) : c)));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !active) return;
    setError(null);
    setInput("");

    const userMsg: UiMessage = { id: uid(), role: "user", content: trimmed };
    const pending: UiMessage = { id: uid(), role: "assistant", content: "", pending: true };
    const isFirstUserMessage = active.messages.filter((m) => m.role === "user").length === 0;

    patchActive((c) => ({
      ...c,
      title: isFirstUserMessage ? trimmed.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg, pending],
    }));

    const history: ChatMessage[] = [...active.messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setSending(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "AI assistant failed");
      }
      const data = (await response.json()) as { reply: string };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === pending.id ? { ...m, content: data.reply, pending: false } : m,
                ),
              }
            : c,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, messages: c.messages.filter((m) => m.id !== pending.id) } : c,
        ),
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function newChat() {
    const c = newConversation();
    setConversations([c, ...conversations]);
    setActiveId(c.id);
  }

  function deleteChat(id: string) {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const c = newConversation();
      setConversations([c]);
      setActiveId(c.id);
    } else {
      setConversations(remaining);
      if (activeId === id) setActiveId(remaining[0].id);
    }
  }

  function startRename(id: string, current: string) {
    setRenamingId(id);
    setRenameValue(current);
  }
  function commitRename() {
    if (!renamingId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === renamingId ? { ...c, title: renameValue.trim() || c.title } : c)),
    );
    setRenamingId(null);
  }

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300 to-sky-400 opacity-25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center text-white shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                SQA Copilot
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                  Live
                </span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Your friendly assistant for testing, automation, and QA workflows.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/help/faq"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
            >
              <HelpCircle className="h-4 w-4" /> FAQ
            </Link>
            <Link
              href="/help/tutorial"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
            >
              <GraduationCap className="h-4 w-4" /> Tutorial
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-15rem)] min-h-[480px]">
        {/* Sidebar of chats */}
        <aside className="rounded-3xl glass p-3 flex flex-col overflow-hidden">
          <button
            onClick={newChat}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-2">
            <MessagesSquare className="h-3.5 w-3.5" /> Chats
          </div>
          <div className="mt-1 flex-1 overflow-y-auto space-y-1 pr-1">
            {conversations.map((c) => {
              const isActive = c.id === activeId;
              const isRenaming = renamingId === c.id;
              return (
                <div
                  key={c.id}
                  className={[
                    "group flex items-center gap-2 px-2 py-2 rounded-xl text-sm cursor-pointer",
                    isActive ? "bg-foreground text-background" : "hover:bg-white/70",
                  ].join(" ")}
                  onClick={() => !isRenaming && setActiveId(c.id)}
                >
                  {isRenaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="flex-1 px-2 py-1 rounded text-foreground bg-white border border-primary text-sm outline-none"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          commitRename();
                        }}
                        className="h-6 w-6 grid place-items-center rounded hover:bg-success/20 text-success"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(null);
                        }}
                        className="h-6 w-6 grid place-items-center rounded hover:bg-destructive/20 text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{c.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(c.id, c.title);
                        }}
                        className={`opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded ${isActive ? "hover:bg-white/20" : "hover:bg-white"}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(c.id);
                        }}
                        className={`opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded ${isActive ? "hover:bg-white/20" : "hover:bg-destructive/15 hover:text-destructive"}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 px-2 text-[10px] text-muted-foreground">Saved in this browser only.</p>
        </aside>

        {/* Chat panel */}
        <div className="rounded-3xl glass flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {!active || active.messages.length === 0 ? (
              <EmptyState onPick={(s) => send(s)} />
            ) : (
              active.messages.map((m) => <Bubble key={m.id} message={m} />)
            )}
          </div>

          {error && (
            <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-white/40 bg-white/40 backdrop-blur-md p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl bg-white/70 border border-white/70 p-2 focus-within:border-primary transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask, generate, or paste a failing log..."
                disabled={sending}
                className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 px-2 max-h-32"
                style={{ minHeight: 36 }}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
            <div className="mt-2 px-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Press Enter to send · Shift + Enter for new line</span>
              <span>Chats saved locally · {conversations.length} total</span>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div className="h-16 w-16 rounded-3xl bg-[image:var(--gradient-primary)] grid place-items-center shadow-lg">
        <MessageCircle className="h-7 w-7 text-white" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">How can SQA Copilot help today?</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-md">
        Ask about projects, generate test cases, draft scripts, or paste a failing log to get fix
        suggestions.
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-2xl w-full">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left rounded-2xl bg-white/60 border border-white/70 hover:border-primary/40 hover:bg-white px-4 py-3 text-sm transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={[
          "h-9 w-9 rounded-2xl grid place-items-center shrink-0 text-sm font-semibold shadow-sm",
          isUser
            ? "bg-foreground text-background"
            : "bg-[image:var(--gradient-primary)] text-white",
        ].join(" ")}
      >
        {isUser ? "HZ" : <Sparkles className="h-4 w-4" />}
      </div>
      <div
        className={[
          "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-foreground text-background rounded-tr-sm"
            : "bg-white/70 border border-white/70 rounded-tl-sm",
        ].join(" ")}
      >
        {message.pending ? (
          <TypingIndicator />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-code:text-foreground prose-code:bg-white/80 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground prose-pre:text-background">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
        style={{ animationDelay: "240ms" }}
      />
    </div>
  );
}

export default ChatPage;
