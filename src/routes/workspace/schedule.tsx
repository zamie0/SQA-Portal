import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { projects } from "@/shared/lib/mock-data";
import { listUserProjects } from "@/shared/lib/user-projects";
import { useEventTick, useLocalStorage } from "@/shared/lib/use-storage";
import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Repeat,
  Trash2,
  Download,
  X,
} from "lucide-react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — QE Automation Hub" },
      { name: "description", content: "Calendar-based scheduling for automation runs and bots." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SchedulePage />
    </RequireAuth>
  ),
});

interface ScheduleEvent {
  id: string;
  title: string;
  projectId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** HH:MM 24h */
  time: string;
  repeat: "once" | "daily" | "weekly" | "monthly";
  notes?: string;
}

const seedEvents: ScheduleEvent[] = [
  {
    id: "se1",
    title: "Nightly regression",
    projectId: "tmforce",
    date: today(0),
    time: "02:00",
    repeat: "daily",
  },
  {
    id: "se2",
    title: "API regression",
    projectId: "intt",
    date: today(0),
    time: "11:00",
    repeat: "daily",
  },
  {
    id: "se3",
    title: "Daily ledger reconciliation",
    projectId: "camelia",
    date: today(0),
    time: "06:30",
    repeat: "daily",
  },
  {
    id: "se4",
    title: "Release smoke",
    projectId: "intt",
    date: today(2),
    time: "19:00",
    repeat: "weekly",
  },
  {
    id: "se5",
    title: "Weekly KPI deck",
    projectId: "camelia",
    date: today(4),
    time: "17:00",
    repeat: "weekly",
  },
];

function today(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function SchedulePage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useLocalStorage<ScheduleEvent[]>("qe-hub.schedule.v1", seedEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  useEventTick("qe-hub.user-projects-changed");
  const userProjects = listUserProjects();
  const allProjects = [...projects, ...userProjects];

  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const firstDay = new Date(year, month, 1).getDay(); // 0 Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = cursor.toLocaleString("default", { month: "long", year: "numeric" });

  // Build cells (Mon-start week)
  const offset = (firstDay + 6) % 7; // shift Sun=0 to last
  const cells: { date: string | null }[] = [];
  for (let i = 0; i < offset; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: iso });
  }

  // Compute occurrences for the visible month including repeats
  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    cells.forEach((c) => {
      if (!c.date) return;
      const cellDate = new Date(c.date);
      events.forEach((e) => {
        const start = new Date(e.date);
        if (cellDate < start) return;
        const matches =
          e.repeat === "once"
            ? c.date === e.date
            : e.repeat === "daily"
              ? true
              : e.repeat === "weekly"
                ? cellDate.getDay() === start.getDay()
                : e.repeat === "monthly"
                  ? cellDate.getDate() === start.getDate()
                  : false;
        if (matches) {
          (map[c.date!] ||= []).push(e);
        }
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, year, month]);

  const upcoming = useMemo(() => {
    const list: { event: ScheduleEvent; when: Date }[] = [];
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 14);
    for (let d = new Date(now); d <= horizon; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      events.forEach((e) => {
        const start = new Date(e.date);
        if (d < start) return;
        const matches =
          e.repeat === "once"
            ? iso === e.date
            : e.repeat === "daily"
              ? true
              : e.repeat === "weekly"
                ? d.getDay() === start.getDay()
                : e.repeat === "monthly"
                  ? d.getDate() === start.getDate()
                  : false;
        if (matches) {
          const [h, m] = e.time.split(":").map(Number);
          const when = new Date(d);
          when.setHours(h, m, 0, 0);
          if (when >= now) list.push({ event: e, when });
        }
      });
    }
    return list.sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, 8);
  }, [events]);

  function exportIcs() {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QE Hub//Schedule//EN"];
    events.forEach((e) => {
      const start = new Date(`${e.date}T${e.time}`);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const fmt = (d: Date) =>
        d
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
      const rrule =
        e.repeat === "daily"
          ? "RRULE:FREQ=DAILY"
          : e.repeat === "weekly"
            ? "RRULE:FREQ=WEEKLY"
            : e.repeat === "monthly"
              ? "RRULE:FREQ=MONTHLY"
              : "";
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@qe-hub`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title}`,
        rrule,
        "END:VEVENT",
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.filter(Boolean).join("\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qe-hub-schedule.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  function addEvent(input: Omit<ScheduleEvent, "id">) {
    setEvents([{ ...input, id: `se-${Date.now().toString(36)}` }, ...events]);
  }

  function deleteEvent(id: string) {
    setEvents(events.filter((e) => e.id !== id));
  }

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calendar view of every recurring run and bot, across {allProjects.length} projects.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportIcs}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export .ics
          </button>
          <button
            onClick={() => {
              setSelectedDate(today(0));
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg"
          >
            <Plus className="h-4 w-4" /> Add to calendar
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {/* Calendar */}
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold inline-flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> {monthName}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="h-8 w-8 grid place-items-center rounded-lg glass"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                className="px-3 h-8 rounded-lg glass text-xs font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="h-8 w-8 grid place-items-center rounded-lg glass"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="px-2">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => {
              if (!c.date) return <div key={i} className="min-h-[88px]" />;
              const isToday = c.date === today(0);
              const cellEvents = eventsByDate[c.date] || [];
              return (
                <button
                  key={c.date}
                  onClick={() => {
                    setSelectedDate(c.date);
                    setShowForm(false);
                  }}
                  className={[
                    "text-left min-h-[88px] rounded-xl p-2 transition border",
                    isToday
                      ? "bg-[image:var(--gradient-primary)] text-white border-transparent"
                      : selectedDate === c.date
                        ? "bg-white border-primary"
                        : "bg-white/40 border-white/60 hover:bg-white/70",
                  ].join(" ")}
                >
                  <div className={`text-xs font-bold ${isToday ? "" : "text-foreground"}`}>
                    {Number(c.date.slice(-2))}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {cellEvents.slice(0, 2).map((e) => {
                      const proj = allProjects.find((p) => p.id === e.projectId);
                      return (
                        <div
                          key={e.id}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${
                            isToday ? "bg-white/30" : "bg-white/80"
                          }`}
                          title={e.title}
                        >
                          {e.time} {proj?.initials}
                        </div>
                      );
                    })}
                    {cellEvents.length > 2 && (
                      <div
                        className={`text-[10px] ${isToday ? "text-white/80" : "text-muted-foreground"}`}
                      >
                        +{cellEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedDate && (
            <div className="rounded-3xl glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">
                  {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => setShowForm((f) => !f)}
                  className="text-xs px-3 py-1 rounded-lg bg-foreground text-background font-medium inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>

              {showForm && (
                <EventForm
                  date={selectedDate}
                  projects={allProjects}
                  onCancel={() => setShowForm(false)}
                  onSave={(input) => {
                    addEvent(input);
                    setShowForm(false);
                  }}
                />
              )}

              <div className="space-y-2 mt-3">
                {(eventsByDate[selectedDate] || []).map((e) => {
                  const proj = allProjects.find((p) => p.id === e.projectId);
                  return (
                    <div
                      key={e.id}
                      className="rounded-xl bg-white/60 border border-white/70 p-3 flex items-center gap-3"
                    >
                      <div
                        className={`h-8 w-8 rounded-lg bg-gradient-to-br ${proj?.color ?? "from-slate-400 to-slate-500"} grid place-items-center text-white text-[10px] font-bold`}
                      >
                        {proj?.initials ?? "??"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> {e.time} · <Repeat className="h-3 w-3" />{" "}
                          {e.repeat}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEvent(e.id)}
                        className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {(eventsByDate[selectedDate] || []).length === 0 && !showForm && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No events. Click "Add" to create one.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-3xl glass p-5">
            <h3 className="font-semibold mb-3">Upcoming (14 days)</h3>
            <div className="space-y-2">
              {upcoming.map(({ event: e, when }) => {
                const proj = allProjects.find((p) => p.id === e.projectId);
                return (
                  <div
                    key={`${e.id}-${when.getTime()}`}
                    className="rounded-xl bg-white/50 border border-white/60 p-2.5 flex items-center gap-2.5"
                  >
                    <div
                      className={`h-8 w-8 rounded-lg bg-gradient-to-br ${proj?.color ?? "from-slate-400 to-slate-500"} grid place-items-center text-white text-[10px] font-bold`}
                    >
                      {proj?.initials ?? "??"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {when.toLocaleString(undefined, {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcoming.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nothing scheduled.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function EventForm({
  date,
  projects,
  onSave,
  onCancel,
}: {
  date: string;
  projects: { id: string; name: string }[];
  onSave: (e: {
    title: string;
    projectId: string;
    date: string;
    time: string;
    repeat: ScheduleEvent["repeat"];
    notes?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState<ScheduleEvent["repeat"]>("once");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !projectId) return;
        onSave({ title: title.trim(), projectId, date, time, repeat });
      }}
      className="space-y-2 p-3 rounded-xl bg-white/70 border border-white/70"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          New event
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-6 w-6 grid place-items-center rounded text-muted-foreground hover:bg-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Smoke run)"
        className="w-full px-3 py-2 rounded-lg bg-white border border-white/70 outline-none focus:border-primary text-sm"
      />
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white border border-white/70 outline-none focus:border-primary text-sm"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white border border-white/70 outline-none focus:border-primary text-sm"
        />
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as ScheduleEvent["repeat"])}
          className="px-3 py-2 rounded-lg bg-white border border-white/70 outline-none focus:border-primary text-sm"
        >
          <option value="once">Once</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full px-3 py-2 rounded-lg bg-[image:var(--gradient-primary)] text-white text-sm font-medium"
      >
        Save event
      </button>
    </form>
  );
}
