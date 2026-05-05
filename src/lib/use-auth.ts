"use client";

import { useEffect, useState } from "react";
import { AUTH_EVENT, getSession, type PortalUser } from "./auth";

export function useAuth(): PortalUser | null {
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    setUser(getSession());
    const handler = () => setUser(getSession());
    window.addEventListener(AUTH_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(AUTH_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return user;
}
