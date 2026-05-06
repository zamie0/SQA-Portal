import type { ReactNode } from "react";
import { RequireAuth } from "@/shared/components/RequireAuth";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
