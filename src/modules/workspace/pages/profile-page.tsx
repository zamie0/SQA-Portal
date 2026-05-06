"use client";

import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { projects } from "@/shared/lib/mock-data";
import { listUserProjects, useEventTick } from "@/shared/state";
import {
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Activity,
  MessageSquare,
  FolderKanban,
  PlayCircle,
} from "lucide-react";

function ProfilePage() {
  useEventTick("qe-hub.user-projects-changed");
  const userProjects = listUserProjects();
  const allProjects = [...projects, ...userProjects];
  const totalRuns = projects.reduce((acc, p) => acc + p.runs.length, 0);
  const totalPosts = projects.reduce((acc, p) => acc + p.discussions.length, 0);

  const activity = [
    {
      icon: PlayCircle,
      text: "Triggered run “Nightly regression #482” on TMForce",
      time: "2h ago",
    },
    {
      icon: MessageSquare,
      text: "Replied to “Reports export endpoint returning 500”",
      time: "3h ago",
    },
    {
      icon: FolderKanban,
      text: `Created ${userProjects.length} personal project(s)`,
      time: "Today",
    },
    { icon: Calendar, text: "Scheduled “API regression” daily at 11:00", time: "Yesterday" },
  ];

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-7 mb-5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-violet-300 to-sky-400 opacity-30 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-5">
          <div className="h-24 w-24 rounded-3xl bg-[image:var(--gradient-primary)] grid place-items-center text-white text-3xl font-bold shadow-lg">
            HZ
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold">Hazami</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground font-semibold">
                Admin
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-white/60 border border-white/70 text-muted-foreground">
                System Developer
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium">
                Active
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl">
              Owner & maintainer of QE Automation Hub. Building the platform end-to-end — backend,
              automation tooling and product UI.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-4 w-4" /> hazami@qe-hub.dev
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-4 w-4" /> +60 12-345 6789
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> System Developer
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Projects joined" value={allProjects.length} />
        <Stat label="Tests run (total)" value={totalRuns} />
        <Stat label="Forum posts" value={totalPosts} />
        <Stat label="Personal projects" value={userProjects.length} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-3xl glass p-6">
          <h2 className="font-semibold mb-4">Projects you're on</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {allProjects.map((p) => {
              const isUser = "createdAt" in p;
              const photo = isUser ? (p as { photo: string | null }).photo : null;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded-2xl bg-white/60 border border-white/70 p-3 flex items-center gap-3 hover:bg-white transition"
                >
                  {photo ? (
                    <img src={photo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div
                      className={`h-11 w-11 rounded-xl bg-gradient-to-br ${p.color} grid place-items-center text-white text-sm font-bold`}
                    >
                      {p.initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.type}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <h2 className="font-semibold mb-4 inline-flex items-center gap-2">
            <Activity className="h-4 w-4" /> Activity
          </h2>
          <ul className="space-y-3">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-white/70 border border-white/70 grid place-items-center shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{a.text}</p>
                    <span className="text-[11px] text-muted-foreground">{a.time}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl glass p-5">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default ProfilePage;
