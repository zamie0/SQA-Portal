"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/shared/components/RequireAuth";

function HelpLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

export default HelpLayout;
