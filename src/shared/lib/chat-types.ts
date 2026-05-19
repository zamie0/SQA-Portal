export type ChatRole = "system" | "user" | "assistant";

export interface ChatAttachment {
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  pdfReview?: {
    status: "completed" | "failed";
    summary?: string;
    error?: string;
    reviewedAt?: string;
  };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  attachments?: ChatAttachment[];
}
