import { createContext } from "react";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

export const AdminConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);
