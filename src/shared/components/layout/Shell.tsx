"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  PlayCircle,
  Calendar,
  Settings as SettingsIcon,
  Bell,
  Sparkles,
  LifeBuoy,
  MessageCircle,
  CircleHelp,
  // help icons removed: now using only LifeBuoy + MessageCircle
  User as UserIcon,
  LogOut,
  ChevronDown,
  ArrowLeft,
  Server,
  Wrench,
  Bot,
  Brain,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { seedNotifications } from "@/shared/lib/notifications";
import { useAuth } from "@/shared/lib/use-auth";
import {
  logout as doLogout,
  pendingResetCount,
  pendingUserCount,
  AUTH_EVENT,
} from "@/shared/lib/auth";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

const portalNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/projects", label: "Project", icon: FolderKanban },
  { to: "/portal/testbeds", label: "Testbeds", icon: Server },
  { to: "/portal/tools", label: "Tools", icon: Wrench },
];

const toolsNav: NavItem[] = [
  { to: "/portal/tools", label: "All tools", icon: Wrench, exact: true },
  { to: "/tools/orca", label: "Orca", icon: Bot },
  { to: "/tools/qa-genius", label: "QA Genius", icon: Brain },
  { to: "/tools/qe", label: "QE Automation Hub", icon: Sparkles },
  { to: "/tools/performance", label: "Performance Testing", icon: Gauge },
];

const qeNav: NavItem[] = [
  { to: "/tools/qe", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/runs", label: "Runs", icon: PlayCircle },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const helpNav: NavItem[] = [
  { to: "/help", label: "Help", icon: LifeBuoy, exact: true },
  { to: "/help/chat", label: "AI Assistant", icon: MessageCircle },
];

const orcaNav: NavItem[] = [
  { to: "/tools/orca", label: "Overview", icon: Bot, exact: true },
  { to: "/tools/orca/swarms", label: "Swarms", icon: Sparkles },
  { to: "/tools/orca/agents", label: "Agents", icon: Bot },
  { to: "/tools/orca/logs", label: "Logs", icon: PlayCircle },
];

const qaGeniusNav: NavItem[] = [
  { to: "/tools/qa-genius", label: "Generate", icon: Brain, exact: true },
  { to: "/tools/qa-genius/library", label: "Library", icon: FolderKanban },
  { to: "/tools/qa-genius/history", label: "History", icon: Calendar },
];

const performanceNav: NavItem[] = [
  { to: "/tools/performance", label: "Dashboard", icon: Gauge, exact: true },
  { to: "/tools/performance/scenarios", label: "Scenarios", icon: PlayCircle },
  { to: "/tools/performance/reports", label: "Reports", icon: FolderKanban },
];

type Ctx = "qe" | "tools" | "portal" | "orca" | "qa-genius" | "performance";

function getContext(path: string): Ctx {
  if (
    path.startsWith("/tools/qe") ||
    path.startsWith("/projects") ||
    path.startsWith("/runs") ||
    path.startsWith("/schedule") ||
    path.startsWith("/settings")
  )
    return "qe";
  if (path.startsWith("/tools/orca")) return "orca";
  if (path.startsWith("/tools/qa-genius")) return "qa-genius";
  if (path.startsWith("/tools/performance")) return "performance";
  if (path.startsWith("/tools/")) return "tools";
  if (path === "/portal/tools") return "tools";
  return "portal";
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const ctx = getContext(path);
  const user = useAuth();

  const items =
    ctx === "qe"
      ? qeNav
      : ctx === "tools"
        ? toolsNav
        : ctx === "orca"
          ? orcaNav
          : ctx === "qa-genius"
            ? qaGeniusNav
            : ctx === "performance"
              ? performanceNav
              : portalNav;
  const heading =
    ctx === "qe"
      ? "QE Automation Hub"
      : ctx === "tools"
        ? "Tools"
        : ctx === "orca"
          ? "Orca"
          : ctx === "qa-genius"
            ? "QA Genius"
            : ctx === "performance"
              ? "Performance"
              : "SQA Portal";
  const subheading =
    ctx === "qe"
      ? "Automation OS"
      : ctx === "tools"
        ? "Workspace tools"
        : ctx === "orca"
          ? "Test orchestration"
          : ctx === "qa-genius"
            ? "AI test cases"
            : ctx === "performance"
              ? "Load & stress"
              : "Quality Assurance";

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-64 m-4 mr-0 rounded-3xl glass p-5 sticky top-4 self-start h-[calc(100vh-2rem)] overflow-y-auto">
        <SmartLogo heading={heading} subheading={subheading} />

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.exact
              ? path === item.to
              : path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  active
                    ? "bg-[image:var(--gradient-primary)] text-white shadow-md"
                    : "text-foreground/70 hover:bg-white/60 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {user?.role === "admin" && ctx === "portal" && <AdminLink path={path} />}

          <div className="mt-5 mb-1.5 px-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <CircleHelp className="h-3.5 w-3.5" /> Support
          </div>
          {helpNav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  active
                    ? "bg-foreground text-background shadow-md"
                    : "text-foreground/70 hover:bg-white/60 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <ProfileMenu placement="sidebar" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 m-4 rounded-3xl glass px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1" />
          <ProfileMenu />
        </header>

        <main className="p-4 pb-10 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SmartLogo({ heading, subheading }: { heading: string; subheading: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href="/"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 px-2 mb-8 group"
      title="Back to homepage"
    >
      <div className="h-10 w-10 rounded-2xl bg-[image:var(--gradient-primary)] grid place-items-center shadow-lg transition-transform group-hover:scale-105">
        {hover ? (
          <ArrowLeft className="h-5 w-5 text-white" />
        ) : (
          <Sparkles className="h-5 w-5 text-white" />
        )}
      </div>
      <div>
        <div className="font-display font-bold leading-tight">{heading}</div>
        <div className="text-xs text-muted-foreground">{subheading}</div>
      </div>
    </Link>
  );
}

function AdminLink({ path }: { path: string }) {
  const [counts, setCounts] = useState({ users: 0, resets: 0 });
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [users, resets] = await Promise.all([
        pendingUserCount().catch(() => 0),
        pendingResetCount().catch(() => 0),
      ]);
      if (active) setCounts({ users, resets });
    };
    void refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const badge = counts.users + counts.resets;
  const active = path.startsWith("/portal/admin");
  return (
    <Link
      href="/portal/admin"
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
        active
          ? "bg-[image:var(--gradient-primary)] text-white shadow-md"
          : "text-foreground/70 hover:bg-white/60 hover:text-foreground",
      ].join(" ")}
    >
      <ShieldCheck className="h-4 w-4" />
      <span className="flex-1">Admin</span>
      {badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}

function ProfileMenu({ placement = "header" }: { placement?: "header" | "sidebar" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useAuth();
  const unread = seedNotifications.filter((n) => !n.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function go(to: string) {
    setOpen(false);
    router.push(to);
  }

  function logout() {
    setOpen(false);
    doLogout();
    router.push("/login");
  }

  const initials = (user?.fullName || user?.username || "??")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 shadow-sm transition-all hover:border-primary/35 hover:bg-white hover:shadow-md",
          placement === "sidebar" ? "w-full p-2" : "pr-2 pl-1 py-1",
        ].join(" ")}
      >
        <div className="relative h-9 w-9 shrink-0 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-white text-sm font-semibold shadow">
          {initials}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unread}
            </span>
          )}
        </div>
        <div className="hidden sm:block text-left leading-tight min-w-0 flex-1">
          <div className="text-xs font-semibold">{user?.fullName || user?.username || "Guest"}</div>
          <div className="text-[10px] text-muted-foreground">
            {user ? (user.role === "admin" ? "Administrator" : "User") : "Not signed in"}
          </div>
        </div>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open ? "rotate-180 text-primary" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div
          className={[
            "absolute rounded-3xl border border-white/80 bg-white/95 p-2 shadow-2xl z-40 backdrop-blur-xl",
            placement === "sidebar"
              ? "left-0 right-0 bottom-full mb-3 w-full"
              : "right-0 top-full mt-2 w-72",
          ].join(" ")}
        >
          <div className="rounded-2xl bg-[image:var(--gradient-soft)] px-3 py-3 border border-white/70 flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-[image:var(--gradient-primary)] grid place-items-center text-white font-semibold shadow-md">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">
                {user?.fullName || user?.username || "Guest"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user
                  ? `${user.role === "admin" ? "Admin" : "User"} · ${user.email}`
                  : "Sign in to continue"}
              </div>
            </div>
          </div>

          <div className="my-2 space-y-1">
            <DropItem
              icon={Bell}
              label="Notifications"
              badge={unread}
              onClick={() => go("/notifications")}
            />
            <DropItem icon={UserIcon} label="Profile" onClick={() => go("/profile")} />
            <DropItem icon={SettingsIcon} label="Settings" onClick={() => go("/settings")} />
            {user?.role === "admin" && (
              <DropItem
                icon={ShieldCheck}
                label="Admin panel"
                onClick={() => go("/portal/admin")}
              />
            )}
          </div>
          <div className="my-2 border-t border-border/60" />
          {user ? (
            <DropItem icon={LogOut} label="Logout" danger onClick={logout} />
          ) : (
            <DropItem icon={UserIcon} label="Sign in" onClick={() => go("/login")} />
          )}
        </div>
      )}
    </div>
  );
}

function DropItem({
  icon: Icon,
  label,
  badge,
  onClick,
  danger,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all",
        danger
          ? "text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-md"
          : "text-foreground hover:bg-primary/12 hover:text-primary hover:shadow-sm",
      ].join(" ")}
    >
      <Icon
        className={[
          "h-4 w-4 transition-colors",
          danger ? "group-hover:text-destructive-foreground" : "group-hover:text-primary",
        ].join(" ")}
      />
      <span className="flex-1 text-left">{label}</span>
      {!!badge && badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}
