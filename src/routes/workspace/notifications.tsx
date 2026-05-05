import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { RequireAuth } from "@/components/RequireAuth";
import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  CalendarClock,
  Check,
} from "lucide-react";
import { seedNotifications, type Notification } from "@/lib/notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — QE Automation Hub" },
      {
        name: "description",
        content: "Failed tests, completed runs and forum replies in one feed.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <NotificationsPage />
    </RequireAuth>
  ),
});

const ICONS: Record<Notification["kind"], typeof Bell> = {
  fail: AlertTriangle,
  pass: CheckCircle2,
  forum: MessageCircle,
  schedule: CalendarClock,
};

const TINTS: Record<Notification["kind"], string> = {
  fail: "bg-destructive/15 text-destructive",
  pass: "bg-success/15 text-success",
  forum: "bg-primary/15 text-primary",
  schedule: "bg-warning/20 text-warning-foreground",
};

function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(seedNotifications);
  const [filter, setFilter] = useState<"all" | "unread" | Notification["kind"]>("all");

  const visible = items.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.kind === filter;
  });
  const unread = items.filter((i) => !i.read).length;

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }
  function toggle(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-400 to-amber-400 grid place-items-center text-white shadow-lg">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread} unread · {items.length} total
            </p>
          </div>
        </div>
        <button
          onClick={markAll}
          disabled={unread === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Mark all as read
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "unread", "fail", "pass", "forum", "schedule"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize ${
              filter === f
                ? "bg-foreground text-background"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-3xl glass p-10 text-center text-sm text-muted-foreground">
            Nothing here. You're all caught up 🎉
          </div>
        ) : (
          visible.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <div
                key={n.id}
                className={`rounded-2xl glass p-4 flex items-start gap-3 ${
                  !n.read ? "ring-1 ring-primary/30" : ""
                }`}
              >
                <div
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${TINTS[n.kind]}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{n.title}</h3>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span className="ml-auto text-xs text-muted-foreground">{n.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {n.href && (
                      <Link to={n.href as "/"} className="text-xs font-medium text-primary">
                        Open →
                      </Link>
                    )}
                    <button
                      onClick={() => toggle(n.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Mark as {n.read ? "unread" : "read"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
