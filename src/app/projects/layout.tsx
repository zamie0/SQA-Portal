import type { ReactNode } from "react";
import { RequireAuth } from "@/components/shared/RequireAuth";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
