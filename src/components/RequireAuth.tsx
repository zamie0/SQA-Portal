"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const user = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      // wait one tick: useAuth returns null on first render before hydration
      const t = setTimeout(() => {
        if (!getSessionSync()) router.push("/login");
      }, 0);
      return () => clearTimeout(t);
    }
    if (admin && user.role !== "admin") {
      router.push("/");
    }
  }, [user, admin, router]);

  if (!user) return null;
  if (admin && user.role !== "admin") return null;
  return <>{children}</>;
}

function getSessionSync() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("sqa.session");
  } catch {
    return null;
  }
}
