"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT, getSession, type PortalUser } from "./auth";

export function useAuth(): PortalUser | null {
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await getSession().catch(() => null);
      if (active) setUser(next);
    };
    void refresh();
    const handler = () => void refresh();
    window.addEventListener(AUTH_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return user;
}
