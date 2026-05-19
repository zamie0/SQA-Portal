"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/shared/components/layout/Shell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  ClipboardCopy,
  HelpCircle,
  GraduationCap,
  Settings,
  Plus,
  Trash2,
  Pencil,
  MessagesSquare,
  Check,
  X,
  Paperclip,
  Mic,
  Square,
  FileText,
  Image as ImageIcon,
  Volume2,
  BookOpen,
  Bot,
  Loader2,
  Eye,
  FileSearch,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/shared/lib/chat-types";
import { useAuth, useLocalStorage } from "@/shared/state";

const SUGGESTIONS = [
  "How do I create my first test automation project?",
  "What's the difference between Test Automation and RPA?",
  "Show me how to schedule a nightly suite",
  "How do I link a test case to an API endpoint?",
];

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = [
  "image/*",
  "audio/*",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  ".md",
  ".log",
  ".xml",
  ".yaml",
  ".yml",
  ".robot",
  ".js",
  ".ts",
  ".tsx",
  ".py",
  ".java",
].join(",");

interface UiMessage extends ChatMessage {
  id: string;
  pending?: boolean;
}

interface AttachmentDraft {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string;
  previewUrl: string;
  pdfReview?:
    | NonNullable<ChatMessage["attachments"]>[number]["pdfReview"]
    | {
        status: "reviewing";
      };
}

interface ToolHandoff {
  href: string;
  prompt: string;
  autoGenerate?: boolean;
  attachments: Array<{
    name: string;
    mimeType: string;
    size: number;
    data: string;
  }>;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  messages: UiMessage[];
}

type PdfReviewDialogState = {
  name: string;
  size: number;
  data?: string;
  summary?: string;
  error?: string;
  reviewedAt?: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newConversation(): Conversation {
  return { id: uid(), title: "New chat", createdAt: Date.now(), messages: [] };
}

function getCopilotRequirementContext(conversation?: Conversation) {
  if (!conversation) return "";

  return conversation.messages
    .filter((message) => message.role === "user" && message.content.trim())
    .slice(-6)
    .map((message) => {
      const pdfSummaries = getPdfReviewContext(message);
      return [message.content.trim(), pdfSummaries].filter(Boolean).join("\n\n");
    })
    .join("\n\n")
    .trim();
}

function getPdfReviewContext(message: Pick<UiMessage, "attachments">) {
  return (
    message.attachments
      ?.filter((attachment) => attachment.pdfReview?.status === "completed")
      .map(
        (attachment) =>
          `PDF Review Summary - ${attachment.name}:\n${attachment.pdfReview?.summary ?? ""}`,
      )
      .join("\n\n") ?? ""
  );
}

function stripConversationForMemory(conversation: Conversation): Conversation {
  return {
    ...conversation,
    messages: conversation.messages
      .filter((message) => !message.pending)
      .slice(-80)
      .map((message) => ({
        ...message,
        attachments: message.attachments?.map(({ data, ...attachment }) => attachment),
      })),
  };
}

function ChatPage() {
  const router = useRouter();
  const user = useAuth();
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
  const qaGeniusContext = useMemo(() => getCopilotRequirementContext(active), [active]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [recording, setRecording] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptValue, setEditingPromptValue] = useState("");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [pdfReviewDialog, setPdfReviewDialog] = useState<PdfReviewDialogState | null>(null);
  const [tutorialDismissed, setTutorialDismissed] = useLocalStorage<boolean>(
    "sqa-copilot:tutorial-dismissed",
    false,
  );
  const [showTutorial, setShowTutorial] = useState(false);
  const reviewingPdf = attachments.some(
    (attachment) => attachment.pdfReview?.status === "reviewing",
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const remoteMemoryReadyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const titleRefreshKeysRef = useRef<Record<string, string>>({});

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, sending]);

  useEffect(
    () => () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    remoteMemoryReadyRef.current = false;
    if (!user?.id) return;

    let active = true;
    const loadMemory = async () => {
      try {
        const response = await fetch(
          `/api/copilot/conversations?userId=${encodeURIComponent(user.id)}`,
        );
        if (!response.ok) throw new Error(await response.text());
        const data = (await response.json()) as {
          activeId?: string;
          conversations?: Conversation[];
        };

        if (!active) return;

        if (data.conversations?.length) {
          setConversations(data.conversations);
          setActiveId(data.activeId || data.conversations[0].id);
        }
      } catch (error) {
        console.warn("Unable to load SQA Copilot memory.", error);
      } finally {
        if (active) remoteMemoryReadyRef.current = true;
      }
    };

    void loadMemory();

    return () => {
      active = false;
    };
  }, [setActiveId, setConversations, user?.id]);

  useEffect(() => {
    if (!user?.id || !remoteMemoryReadyRef.current) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      void fetch("/api/copilot/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          activeId,
          conversations: conversations.map(stripConversationForMemory),
        }),
      }).catch((error) => {
        console.warn("Unable to save SQA Copilot memory.", error);
      });
    }, 600);
  }, [activeId, conversations, user?.id]);

  useEffect(() => {
    if (!active) return;

    const completedMessages = active.messages.filter((message) => !message.pending);
    const lastMessage = completedMessages.at(-1);
    const userMessageCount = completedMessages.filter((message) => message.role === "user").length;

    if (lastMessage?.role !== "assistant" || userMessageCount === 0) return;

    const titleKey = completedMessages
      .map((message) => `${message.role}:${message.content}`)
      .join("\n")
      .slice(-12_000);

    if (titleRefreshKeysRef.current[active.id] === titleKey) return;
    titleRefreshKeysRef.current[active.id] = titleKey;

    const titleMessages: ChatMessage[] = completedMessages.slice(-8).map((message) => ({
      role: message.role,
      content: messageContentWithPdfContext(message),
      attachments: message.attachments?.filter(attachmentHasPromptContext),
    }));

    void refreshConversationTitle(active.id, titleMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.messages]);

  function patchActive(fn: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === activeId ? fn(c) : c)));
  }

  async function executePrompt({
    prompt,
    conversationId,
    history,
    pendingId,
    onFailure,
  }: {
    prompt: string;
    conversationId: string;
    history: ChatMessage[];
    pendingId: string;
    onFailure: () => void;
  }) {
    setSending(true);
    try {
      const endpoint = shouldUseAgenticTesting(prompt) ? "/api/copilot/agent" : "/api/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "SQA Copilot failed");
      }
      const data = (await response.json()) as { reply: string };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === pendingId ? { ...m, content: data.reply, pending: false } : m,
                ),
              }
            : c,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      onFailure();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function refreshConversationTitle(conversationId: string, messages: ChatMessage[]) {
    try {
      const response = await fetch("/api/copilot/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) return;

      const data = (await response.json()) as { title?: string };
      const title = data.title?.trim();
      if (!title) return;

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, title } : conversation,
        ),
      );
    } catch (error) {
      console.warn("Unable to update SQA Copilot chat title.", error);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || sending || recording || reviewingPdf || !active)
      return;
    setError(null);
    setInput("");
    const outgoingAttachments = attachments;
    setAttachments([]);

    const prompt = trimmed || attachmentOnlyPrompt(outgoingAttachments);
    const messageAttachments = outgoingAttachments.map(({ previewUrl, id, ...attachment }) => ({
      ...attachment,
      pdfReview: attachment.pdfReview?.status === "reviewing" ? undefined : attachment.pdfReview,
    }));
    const userMsg: UiMessage = {
      id: uid(),
      role: "user",
      content: prompt,
      attachments: messageAttachments,
    };
    const apiUserMsg: ChatMessage = {
      role: "user",
      content: prompt,
      attachments: messageAttachments,
    };
    const pending: UiMessage = { id: uid(), role: "assistant", content: "", pending: true };
    const isFirstUserMessage = active.messages.filter((m) => m.role === "user").length === 0;

    patchActive((c) => ({
      ...c,
      title: isFirstUserMessage
        ? trimmed
          ? "Naming chat..."
          : `Reviewing ${outgoingAttachments[0]?.name || "attachment"}`
        : c.title,
      messages: [...c.messages, userMsg, pending],
    }));

    const history: ChatMessage[] = [...active.messages, apiUserMsg].map((m) => ({
      role: m.role,
      content: messageContentWithPdfContext(m),
      attachments: m.attachments?.filter(attachmentHasPromptContext),
    }));

    await executePrompt({
      prompt,
      conversationId: active.id,
      history,
      pendingId: pending.id,
      onFailure: () => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, messages: c.messages.filter((m) => m.id !== pending.id) }
              : c,
          ),
        );
        setAttachments(outgoingAttachments);
      },
    });
  }

  async function copyPrompt(message: UiMessage) {
    if (message.role !== "user" || !message.content.trim()) return;

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedPromptId(message.id);
      window.setTimeout(
        () => setCopiedPromptId((current) => (current === message.id ? null : current)),
        1400,
      );
    } catch {
      setError("Browser clipboard access failed. Select the prompt text and copy it manually.");
    }
  }

  function startEditPrompt(message: UiMessage) {
    if (message.role !== "user" || sending || recording) return;
    setError(null);
    setEditingPromptId(message.id);
    setEditingPromptValue(message.content);
  }

  function cancelEditPrompt() {
    setEditingPromptId(null);
    setEditingPromptValue("");
  }

  async function saveEditedPrompt(messageId: string) {
    const prompt = editingPromptValue.trim();
    if (!prompt || sending || recording || !active) return;

    const messageIndex = active.messages.findIndex((message) => message.id === messageId);
    const original = active.messages[messageIndex];
    if (messageIndex < 0 || original?.role !== "user") return;

    if (prompt === original.content) {
      cancelEditPrompt();
      return;
    }

    setError(null);
    cancelEditPrompt();

    const retainedMessages = active.messages.slice(0, messageIndex);
    const updatedUserMessage: UiMessage = {
      ...original,
      content: prompt,
    };
    const pending: UiMessage = { id: uid(), role: "assistant", content: "", pending: true };

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              title:
                messageIndex === active.messages.findIndex((message) => message.role === "user")
                  ? "Naming chat..."
                  : conversation.title,
              messages: [...retainedMessages, updatedUserMessage, pending],
            }
          : conversation,
      ),
    );

    const apiUserMessage: ChatMessage = {
      role: "user",
      content: prompt,
      attachments: updatedUserMessage.attachments?.filter(attachmentHasPromptContext),
    };
    const history: ChatMessage[] = [...retainedMessages, apiUserMessage].map((message) => ({
      role: message.role,
      content: messageContentWithPdfContext(message),
      attachments: message.attachments?.filter(attachmentHasPromptContext),
    }));

    await executePrompt({
      prompt,
      conversationId: activeId,
      history,
      pendingId: pending.id,
      onFailure: () => {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === activeId
              ? { ...conversation, messages: active.messages }
              : conversation,
          ),
        );
        setEditingPromptId(messageId);
        setEditingPromptValue(prompt);
      },
    });
  }

  async function addFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length === 0) return;

    setError(null);

    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }

    const nextFiles = selected.slice(0, remainingSlots);
    const drafts: AttachmentDraft[] = [];

    for (const file of nextFiles) {
      if (!isSupportedAttachment(file)) {
        setError(`${file.name} is not a supported image, audio, PDF, or text/code file.`);
        continue;
      }

      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`${file.name} is larger than 8 MB.`);
        continue;
      }

      const draft = await fileToAttachmentDraft(file);
      drafts.push(
        draft.mimeType === "application/pdf"
          ? { ...draft, pdfReview: { status: "reviewing" } }
          : draft,
      );
    }

    if (drafts.length > 0) {
      setAttachments((prev) => [...prev, ...drafts]);
      for (const draft of drafts.filter((item) => item.mimeType === "application/pdf")) {
        void reviewPdfAttachment(draft);
      }
    }
  }

  async function reviewPdfAttachment(attachment: AttachmentDraft) {
    try {
      const response = await fetch("/api/copilot/pdf-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          data: attachment.data,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          response.status >= 500
            ? "PDF review service failed on the server. Please retry after the page reloads."
            : message || "PDF cannot be read.",
        );
      }

      const data = (await response.json()) as { summary?: string; reviewedAt?: string };
      if (!data.summary?.trim()) throw new Error("PDF review returned no readable summary.");

      setAttachments((current) =>
        current.map((item) =>
          item.id === attachment.id
            ? {
                ...item,
                pdfReview: {
                  status: "completed",
                  summary: data.summary?.trim(),
                  reviewedAt: data.reviewedAt ?? new Date().toISOString(),
                },
              }
            : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF cannot be read. Try another PDF.";
      setError(message);
      setAttachments((current) =>
        current.map((item) =>
          item.id === attachment.id
            ? {
                ...item,
                pdfReview: {
                  status: "failed",
                  error: message,
                  reviewedAt: new Date().toISOString(),
                },
              }
            : item,
        ),
      );
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });
        stopRecordingStream();
        if (blob.size > 0) {
          const file = new File(
            [blob],
            `voice-note-${new Date().toISOString().slice(0, 19)}.webm`,
            {
              type,
            },
          );
          await addFiles([file]);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start voice recording.");
      stopRecordingStream();
      setRecording(false);
    }
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
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

  function sendToQaGenius() {
    if (!qaGeniusContext) return;

    window.localStorage.setItem(
      "sqa-copilot:tool-handoff",
      JSON.stringify({
        href: "/tools/qa-genius",
        prompt: qaGeniusContext,
        autoGenerate: false,
        attachments: [],
      }),
    );
    router.push("/tools/qa-genius");
  }

  function openTutorial() {
    setTutorialDismissed(true);
    setShowTutorial(true);
  }

  function skipTutorial() {
    setTutorialDismissed(true);
    setShowTutorial(false);
  }

  return (
    <Shell>
      <div className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 rounded-2xl glass-strong p-3 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-300 to-sky-400 opacity-20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-white shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  SQA Copilot
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                    Live
                  </span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground max-w-xl">
                  Your friendly assistant for testing, automation, and QA workflows.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendToQaGenius}
                disabled={!qaGeniusContext}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
              >
                <FileText className="h-3.5 w-3.5" /> Send to QA Genius
              </button>
              <Link
                href="/help/faq"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium"
              >
                <HelpCircle className="h-3.5 w-3.5" /> FAQ
              </Link>
              <Link
                href="/help/tutorial"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium"
              >
                <GraduationCap className="h-3.5 w-3.5" /> Tutorial
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass text-xs font-medium"
              >
                <Settings className="h-3.5 w-3.5" /> Settings
              </Link>
            </div>
          </div>
        </div>

        {!tutorialDismissed && !showTutorial && (
          <FloatingTutorialPrompt onView={openTutorial} onSkip={skipTutorial} />
        )}

        {showTutorial && <CopilotTutorialDialog onClose={() => setShowTutorial(false)} />}
        {pdfReviewDialog && (
          <PdfReviewDialog attachment={pdfReviewDialog} onClose={() => setPdfReviewDialog(null)} />
        )}

        <div className="grid min-h-0 flex-1 grid-rows-[minmax(8rem,12rem)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[280px_1fr] lg:grid-rows-none">
          {/* Sidebar of chats */}
          <aside className="min-h-0 rounded-3xl glass p-3 flex flex-col overflow-hidden">
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
            <p className="mt-2 px-2 text-[10px] text-muted-foreground">
              Saved in this browser only.
            </p>
          </aside>

          {/* Chat panel */}
          <div className="min-h-0 rounded-3xl glass flex flex-col overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {!active || active.messages.length === 0 ? (
                <EmptyState onPick={(s) => send(s)} />
              ) : (
                active.messages.map((m, index) => (
                  <Bubble
                    key={m.id}
                    message={m}
                    handoff={buildToolHandoff(handoffSourceFor(active.messages, index), m)}
                    isEditing={editingPromptId === m.id}
                    editingValue={editingPromptId === m.id ? editingPromptValue : ""}
                    copied={copiedPromptId === m.id}
                    disabled={sending || recording}
                    onCopyPrompt={() => void copyPrompt(m)}
                    onStartEdit={() => startEditPrompt(m)}
                    onEditChange={setEditingPromptValue}
                    onCancelEdit={cancelEditPrompt}
                    onSaveEdit={() => void saveEditedPrompt(m.id)}
                    onOpenTool={(href, handoff) => {
                      if (handoff) {
                        const approvedHandoff =
                          href === "/tools/qa-genius"
                            ? { ...handoff, href, autoGenerate: true }
                            : { ...handoff, href };
                        window.localStorage.setItem(
                          "sqa-copilot:tool-handoff",
                          JSON.stringify(approvedHandoff),
                        );
                      }
                      router.push(href);
                    }}
                    onOpenPdfReview={setPdfReviewDialog}
                  />
                ))
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
              className="shrink-0 border-t border-white/40 bg-white/40 backdrop-blur-md p-3"
            >
              {attachments.length > 0 && (
                <AttachmentDraftList
                  attachments={attachments}
                  onRemove={removeAttachment}
                  onOpenPdfReview={setPdfReviewDialog}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_ATTACHMENT_TYPES}
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <div className="flex items-end gap-2 rounded-2xl bg-white/70 border border-white/70 p-2 focus-within:border-primary transition">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending || reviewingPdf || attachments.length >= MAX_ATTACHMENTS}
                  title="Attach image, file, or audio"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-white disabled:opacity-40"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleRecording()}
                  disabled={sending}
                  title={recording ? "Stop voice recording" : "Record voice"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    recording
                      ? "bg-destructive/15 text-destructive"
                      : "text-muted-foreground hover:bg-white"
                  } disabled:opacity-40`}
                >
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
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
                  disabled={
                    (!input.trim() && attachments.length === 0) ||
                    sending ||
                    recording ||
                    reviewingPdf
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
              <div className="mt-2 px-2 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>
                  {recording
                    ? "Recording voice... press stop when finished"
                    : reviewingPdf
                      ? "Reviewing PDF... summary will be saved with this chat"
                      : "Press Enter to send | Shift + Enter for new line"}
                </span>
                <span>Chats saved locally | {conversations.length} total</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function shouldUseAgenticTesting(input: string) {
  const normalized = input.toLowerCase();
  const asksForAgent =
    /\bagentic\b/.test(normalized) ||
    /\bagent\b/.test(normalized) ||
    /\bdo testing\b/.test(normalized) ||
    /\brun (?:all )?tests?\b/.test(normalized) ||
    /\btest (?:everything|all)\b/.test(normalized);

  const hasTestingScope =
    /\btest(?:ing|s)?\b/.test(normalized) ||
    /\bqa\b/.test(normalized) ||
    /\bautomation\b/.test(normalized) ||
    /\bperformance\b/.test(normalized) ||
    /\bjmeter\b/.test(normalized) ||
    /\brobot\b/.test(normalized);

  return asksForAgent && hasTestingScope;
}

function handoffSourceFor(messages: UiMessage[], index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return messages[i];
  }

  return null;
}

function buildToolHandoff(
  source: UiMessage | null,
  assistantMessage: UiMessage,
): ToolHandoff | null {
  if (!source || assistantMessage.role !== "assistant" || assistantMessage.pending) return null;

  return {
    href: "",
    prompt: [source.content, getPdfReviewContext(source)].filter(Boolean).join("\n\n"),
    attachments:
      source.attachments
        ?.filter((attachment) => attachment.data)
        .map((attachment) => ({
          name: attachment.name,
          mimeType: attachment.mimeType,
          size: attachment.size,
          data: attachment.data ?? "",
        })) ?? [],
  };
}

function attachmentHasPromptContext(attachment: NonNullable<ChatMessage["attachments"]>[number]) {
  return Boolean(attachment.data || attachment.pdfReview?.summary);
}

function messageContentWithPdfContext(message: Pick<UiMessage, "content" | "attachments">) {
  return [message.content, getPdfReviewContext(message)].filter(Boolean).join("\n\n");
}

function attachmentOnlyPrompt(attachments: AttachmentDraft[]) {
  return attachments.length === 1
    ? `Please use this uploaded ${attachmentKind(attachments[0].mimeType)} with the appropriate SQA tool.`
    : "Please analyze these uploaded files.";
}

function PdfReviewDialog({
  attachment,
  onClose,
}: {
  attachment: PdfReviewDialogState;
  onClose: () => void;
}) {
  const pdfSrc = attachment.data ? `data:application/pdf;base64,${attachment.data}` : "";

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="flex h-[min(46rem,calc(100vh-2rem))] w-full max-w-5xl flex-col rounded-3xl border border-white/80 bg-white/95 p-4 shadow-2xl shadow-slate-950/15 animate-in zoom-in-95 slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-md">
                <FileSearch className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">PDF Review</h2>
                <p className="truncate text-xs text-muted-foreground">
                  {attachment.name} | {formatBytes(attachment.size)}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close PDF review"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </div>
            {pdfSrc ? (
              <iframe
                title={`Preview ${attachment.name}`}
                src={pdfSrc}
                className="min-h-0 flex-1 bg-white"
              />
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
                <div>
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/70" />
                  <p className="mt-2 font-medium text-foreground">Preview unavailable</p>
                  <p className="mt-1 max-w-sm">
                    The PDF file data is no longer stored in this conversation. Upload the PDF again
                    to preview it.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              <FileSearch className="h-3.5 w-3.5" />
              AI Summary
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm leading-6 text-slate-800">
              {attachment.summary ? (
                <>
                  {attachment.reviewedAt ? (
                    <div className="mb-3 text-[11px] font-medium text-muted-foreground">
                      Reviewed {new Date(attachment.reviewedAt).toLocaleString()}
                    </div>
                  ) : null}
                  <PdfSummaryContent summary={attachment.summary} />
                </>
              ) : attachment.error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  {attachment.error}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-muted-foreground">
                  The PDF summary is not ready yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function PdfSummaryContent({ summary }: { summary: string }) {
  return (
    <div className="pdf-summary-view space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-4 first:mt-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-950">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-sm font-semibold text-slate-900">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>,
          li: ({ children }) => (
            <li className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-700 shadow-sm">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950">{children}</strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-max border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
              {children}
            </td>
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  );
}

function FloatingTutorialPrompt({ onView, onSkip }: { onView: () => void; onSkip: () => void }) {
  return (
    <div className="pointer-events-none absolute bottom-24 right-6 z-20 w-[min(22rem,calc(100vw-2rem))] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2">
      <div className="pointer-events-auto rounded-2xl border border-sky-200/80 bg-white/95 p-4 text-sm shadow-2xl shadow-sky-950/10 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground">View SQA Copilot tutorial?</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Learn chat basics, tool permission bubbles, agentic testing, and document handoff.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onView}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            View tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

function CopilotTutorialDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-foreground/20 p-4 backdrop-blur-sm animate-in fade-in-0">
      <div className="w-full max-w-2xl rounded-3xl border border-white/80 bg-white/95 p-5 shadow-2xl shadow-slate-950/15 animate-in zoom-in-95 slide-in-from-bottom-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">SQA Copilot quick tutorial</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A short guide to using Copilot safely and effectively.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close tutorial"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Ask QA questions",
              body: "Ask about test cases, automation scripts, logs, bugs, requirements, or testing strategy.",
            },
            {
              title: "Use tool bubbles",
              body: "Copilot asks for your approval before opening an SQA tool workspace.",
            },
            {
              title: "Run agentic testing",
              body: "Say: Use agentic AI to do all testing for https://your-url. Copilot will coordinate approved tools.",
            },
            {
              title: "Send documents to tools",
              body: "Attach a PDF or scenario document, then press Allow when Copilot offers QA Genius.",
            },
          ].map((item, index) => (
            <div key={item.title} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
                Step {index + 1}
              </div>
              <div className="mt-1 text-sm font-semibold text-sky-950">{item.title}</div>
              <p className="mt-1 text-xs leading-5 text-sky-800">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-muted-foreground">
          Copilot only uses whitelisted SQA workflows. For test case generation, it waits for your
          Allow click before moving the prompt into QA Genius.
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function isSupportedAttachment(file: File) {
  const type = file.type || mimeFromName(file.name);
  return (
    type.startsWith("image/") ||
    type.startsWith("audio/") ||
    type === "application/pdf" ||
    type.startsWith("text/") ||
    [
      "application/json",
      "application/xml",
      "application/x-yaml",
      "application/yaml",
      "text/markdown",
      "text/x-python",
      "text/javascript",
      "application/javascript",
      "application/typescript",
    ].includes(type)
  );
}

function mimeFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    csv: "text/csv",
    js: "text/javascript",
    json: "application/json",
    log: "text/plain",
    md: "text/markdown",
    pdf: "application/pdf",
    py: "text/x-python",
    robot: "text/plain",
    ts: "application/typescript",
    tsx: "application/typescript",
    txt: "text/plain",
    xml: "application/xml",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
  };
  return ext ? (map[ext] ?? "application/octet-stream") : "application/octet-stream";
}

function fileToAttachmentDraft(file: File) {
  return new Promise<AttachmentDraft>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.onload = () => {
      const previewUrl = String(reader.result ?? "");
      const [, data = ""] = previewUrl.split(",");
      resolve({
        id: uid(),
        name: file.name,
        mimeType: file.type || mimeFromName(file.name),
        size: file.size,
        data,
        previewUrl,
      });
    };
    reader.readAsDataURL(file);
  });
}

function AttachmentDraftList({
  attachments,
  onRemove,
  onOpenPdfReview,
}: {
  attachments: AttachmentDraft[];
  onRemove: (id: string) => void;
  onOpenPdfReview: (attachment: PdfReviewDialogState) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex max-w-full items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-2 py-1.5 text-xs"
        >
          <AttachmentIcon mimeType={attachment.mimeType} />
          {attachment.mimeType.startsWith("image/") && (
            <img src={attachment.previewUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <div className="max-w-44 truncate font-medium">{attachment.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {attachmentKind(attachment.mimeType)} | {formatBytes(attachment.size)}
            </div>
            {attachment.pdfReview?.status === "reviewing" ? (
              <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Reviewing PDF
              </div>
            ) : attachment.pdfReview?.status === "completed" ? (
              <div className="mt-1 text-[10px] font-medium text-success">PDF summary ready</div>
            ) : attachment.pdfReview?.status === "failed" ? (
              <div className="mt-1 max-w-44 truncate text-[10px] font-medium text-destructive">
                {attachment.pdfReview.error ?? "PDF could not be read"}
              </div>
            ) : null}
            {attachment.mimeType === "application/pdf" ? (
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenPdfReview({
                      name: attachment.name,
                      size: attachment.size,
                      data: attachment.data,
                      summary:
                        attachment.pdfReview?.status === "completed"
                          ? attachment.pdfReview.summary
                          : undefined,
                      error:
                        attachment.pdfReview?.status === "failed"
                          ? attachment.pdfReview.error
                          : undefined,
                      reviewedAt:
                        attachment.pdfReview?.status === "completed" ||
                        attachment.pdfReview?.status === "failed"
                          ? attachment.pdfReview.reviewedAt
                          : undefined,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-1 text-[10px] font-medium text-foreground transition hover:bg-white"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenPdfReview({
                      name: attachment.name,
                      size: attachment.size,
                      data: attachment.data,
                      summary:
                        attachment.pdfReview?.status === "completed"
                          ? attachment.pdfReview.summary
                          : undefined,
                      error:
                        attachment.pdfReview?.status === "failed"
                          ? attachment.pdfReview.error
                          : undefined,
                      reviewedAt:
                        attachment.pdfReview?.status === "completed" ||
                        attachment.pdfReview?.status === "failed"
                          ? attachment.pdfReview.reviewedAt
                          : undefined,
                    })
                  }
                  disabled={attachment.pdfReview?.status === "reviewing"}
                  className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-1 text-[10px] font-medium text-foreground transition hover:bg-white disabled:opacity-50"
                >
                  <FileSearch className="h-3 w-3" />
                  Summary
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            title="Remove attachment"
            className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-white hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-primary" />;
  if (mimeType.startsWith("audio/")) return <Volume2 className="h-4 w-4 text-primary" />;
  return <FileText className="h-4 w-4 text-primary" />;
}

function attachmentKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "PDF";
  return "file";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function Bubble({
  message,
  handoff,
  isEditing,
  editingValue,
  copied,
  disabled,
  onCopyPrompt,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onOpenTool,
  onOpenPdfReview,
}: {
  message: UiMessage;
  handoff: ToolHandoff | null;
  isEditing: boolean;
  editingValue: string;
  copied: boolean;
  disabled: boolean;
  onCopyPrompt: () => void;
  onStartEdit: () => void;
  onEditChange: (value: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenTool: (href: string, handoff: ToolHandoff | null) => void | Promise<void>;
  onOpenPdfReview: (attachment: PdfReviewDialogState) => void;
}) {
  const isUser = message.role === "user";
  const toolSuggestions =
    !isUser && !message.pending ? getAssistantToolSuggestions(message.content) : [];

  return (
    <div className={`group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
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
        className={["flex max-w-[78%] flex-col", isUser ? "items-end" : "items-start"].join(" ")}
      >
        <div
          className={[
            "w-full rounded-2xl px-4 py-2.5 text-sm",
            isUser
              ? "bg-foreground text-background rounded-tr-sm"
              : "bg-white/70 border border-white/70 rounded-tl-sm",
          ].join(" ")}
        >
          {message.pending ? (
            <TypingIndicator />
          ) : isUser && isEditing ? (
            <div className="min-w-[min(34rem,70vw)] space-y-2">
              <textarea
                autoFocus
                value={editingValue}
                onChange={(event) => onEditChange(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    onSaveEdit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
                className="min-h-28 w-full resize-y rounded-xl border border-background/20 bg-background/95 p-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-background/70">
                  Save reruns this prompt and replaces stale follow-up messages.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="inline-flex items-center gap-1 rounded-lg bg-background/10 px-2.5 py-1.5 text-[11px] font-semibold text-background transition hover:bg-background/20"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    disabled={!editingValue.trim() || disabled}
                    className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save and rerun
                  </button>
                </div>
              </div>
            </div>
          ) : isUser ? (
            <>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {!!message.attachments?.length && (
                <div className="mt-2 space-y-1.5">
                  {message.attachments.map((attachment) => (
                    <div
                      key={`${attachment.name}-${attachment.size}`}
                      className="rounded-lg bg-background/10 px-2 py-1 text-[11px]"
                    >
                      <div className="flex items-center gap-1">
                        <AttachmentIcon mimeType={attachment.mimeType} />
                        <span>{attachment.name}</span>
                      </div>
                      {attachment.mimeType === "application/pdf" ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPdfReview({
                                name: attachment.name,
                                size: attachment.size,
                                data: attachment.data,
                                summary:
                                  attachment.pdfReview?.status === "completed"
                                    ? attachment.pdfReview.summary
                                    : undefined,
                                error:
                                  attachment.pdfReview?.status === "failed"
                                    ? attachment.pdfReview.error
                                    : undefined,
                                reviewedAt:
                                  attachment.pdfReview?.status === "completed" ||
                                  attachment.pdfReview?.status === "failed"
                                    ? attachment.pdfReview.reviewedAt
                                    : undefined,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-background/15 px-1.5 py-1 text-[10px] font-medium transition hover:bg-background/25"
                          >
                            <Eye className="h-3 w-3" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPdfReview({
                                name: attachment.name,
                                size: attachment.size,
                                data: attachment.data,
                                summary:
                                  attachment.pdfReview?.status === "completed"
                                    ? attachment.pdfReview.summary
                                    : undefined,
                                error:
                                  attachment.pdfReview?.status === "failed"
                                    ? attachment.pdfReview.error
                                    : undefined,
                                reviewedAt:
                                  attachment.pdfReview?.status === "completed" ||
                                  attachment.pdfReview?.status === "failed"
                                    ? attachment.pdfReview.reviewedAt
                                    : undefined,
                              })
                            }
                            disabled={attachment.pdfReview?.status !== "completed"}
                            className="inline-flex items-center gap-1 rounded-md bg-background/15 px-1.5 py-1 text-[10px] font-medium transition hover:bg-background/25 disabled:opacity-50"
                          >
                            <FileSearch className="h-3 w-3" />
                            Summary
                          </button>
                        </div>
                      ) : null}
                      {attachment.pdfReview?.status === "completed" &&
                      attachment.pdfReview.summary ? (
                        <details className="mt-1 text-background/80">
                          <summary className="cursor-pointer font-medium">
                            PDF review summary
                          </summary>
                          <div className="mt-1 max-h-48 overflow-y-auto rounded-md bg-background/10 p-2 text-[11px] leading-4">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h2: ({ children }) => (
                                  <div className="mt-2 first:mt-0 font-semibold">{children}</div>
                                ),
                                p: ({ children }) => <p className="my-1">{children}</p>,
                                ul: ({ children }) => (
                                  <ul className="my-1 space-y-1">{children}</ul>
                                ),
                                li: ({ children }) => (
                                  <li className="border-l border-background/30 pl-2">{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold">{children}</strong>
                                ),
                              }}
                            >
                              {attachment.pdfReview.summary}
                            </ReactMarkdown>
                          </div>
                        </details>
                      ) : attachment.pdfReview?.status === "failed" ? (
                        <p className="mt-1 text-background/75">
                          {attachment.pdfReview.error ?? "PDF could not be reviewed."}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-a:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-foreground prose-code:bg-white/80 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-foreground prose-pre:text-background">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) =>
                    isFloatingToolHref(href) ? (
                      <>{children}</>
                    ) : (
                      <Link
                        href={href ?? "#"}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {children}
                      </Link>
                    ),
                  table: ({ children }) => (
                    <div className="my-3 w-full overflow-x-auto rounded-xl border border-white/70 bg-white/70">
                      <table className="m-0 w-full min-w-max border-collapse text-left text-xs">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-foreground/5">{children}</thead>,
                  th: ({ children }) => (
                    <th className="whitespace-nowrap border-b border-white/70 px-3 py-2 font-semibold text-foreground">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="max-w-[240px] border-b border-white/60 px-3 py-2 align-top text-foreground/80">
                      {children}
                    </td>
                  ),
                  tr: ({ children }) => <tr className="last:[&_td]:border-b-0">{children}</tr>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {isUser && !message.pending && !isEditing ? (
          <div className="mt-1 flex gap-1 opacity-80 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={onCopyPrompt}
              title="Copy prompt"
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-white/70 hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <ClipboardCopy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              disabled={disabled}
              title="Edit and rerun prompt"
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-white/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        ) : null}
        {toolSuggestions.length > 0 && (
          <div className="mt-2 flex w-full flex-wrap gap-2">
            {toolSuggestions.map((suggestion) => (
              <AssistantToolSuggestion
                key={suggestion.href}
                suggestion={suggestion}
                onAllow={() =>
                  onOpenTool(
                    suggestion.href,
                    handoff ? { ...handoff, href: suggestion.href } : null,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getAssistantToolSuggestions(content: string) {
  const normalized = content.toLowerCase();
  const suggestions = [
    {
      label: "QA Genius",
      href: "/tools/qa-genius",
      description: "Test cases",
      matches: [
        "/tools/qa-genius",
        "qa genius",
        "test case",
        "test cases",
        "test scenario",
        "test scenarios",
      ],
    },
    {
      label: "QE Automation Hub",
      href: "/tools/qe",
      description: "Automation",
      matches: [
        "/tools/qe",
        "qe automation hub",
        "robot framework",
        "automation script",
        "automation suite",
        "rpa",
      ],
    },
    {
      label: "Performance Test",
      href: "/tools/performance",
      description: "Performance",
      matches: [
        "/tools/performance",
        "performance testing",
        "performance test",
        "load testing",
        "stress testing",
        "jmeter",
        "response time",
        "throughput",
        "latency",
        "virtual users",
        "ramp-up",
      ],
    },
  ];

  return suggestions
    .filter((suggestion) => suggestion.matches.some((match) => normalized.includes(match)))
    .map(({ matches, ...suggestion }) => suggestion);
}

function isFloatingToolHref(href?: string) {
  return href === "/tools/qa-genius" || href === "/tools/qe" || href === "/tools/performance";
}

function AssistantToolSuggestion({
  suggestion,
  onAllow,
}: {
  suggestion: { label: string; href: string; description: string };
  onAllow: () => void;
}) {
  return (
    <div className="flex w-full max-w-[16rem] items-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-left text-sky-950 shadow-md shadow-sky-900/10 backdrop-blur-xl transition-all duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 sm:w-auto">
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-sky-600">
          Allow Copilot to open
        </span>
        <span className="block text-xs font-semibold leading-tight">{suggestion.label}</span>
        <span className="block truncate text-[11px] text-sky-700">{suggestion.description}</span>
      </span>
      <button
        type="button"
        onClick={onAllow}
        className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        Allow
      </button>
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
