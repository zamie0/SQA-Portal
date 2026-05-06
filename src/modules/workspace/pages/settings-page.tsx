import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { Shield, Users, GitBranch, Bell } from "lucide-react";

const roles = [
  { name: "Aiman R.", email: "aiman@qe.io", role: "Admin" },
  { name: "Sara T.", email: "sara@qe.io", role: "QE" },
  { name: "Daniel K.", email: "daniel@qe.io", role: "QE" },
  { name: "Lina M.", email: "lina@qe.io", role: "Viewer" },
];

function SettingsPage() {
  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-5">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Roles, integrations and workspace preferences.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Team & roles</h2>
          </div>
          <div className="space-y-2">
            {roles.map((u) => (
              <div
                key={u.email}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-white/60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] text-white grid place-items-center text-xs font-bold">
                    {u.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    u.role === "Admin"
                      ? "bg-primary/15 text-primary"
                      : u.role === "QE"
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">CI/CD integrations</h2>
          </div>
          <div className="space-y-2">
            {[
              { name: "GitHub Actions", status: "Connected" },
              { name: "Jenkins", status: "Connected" },
              { name: "GitLab CI", status: "Available" },
              { name: "CircleCI", status: "Available" },
            ].map((i) => (
              <div
                key={i.name}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-white/60"
              >
                <span className="text-sm font-medium">{i.name}</span>
                <button
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    i.status === "Connected"
                      ? "bg-success/15 text-success"
                      : "bg-foreground text-background"
                  }`}
                >
                  {i.status === "Connected" ? "Connected" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          {[
            { label: "Email me on failed runs", on: true },
            { label: "Slack: #qe-alerts on regression failures", on: true },
            { label: "Weekly summary email", on: false },
          ].map((n) => (
            <div
              key={n.label}
              className="flex items-center justify-between py-3 border-b border-white/50 last:border-b-0"
            >
              <span className="text-sm">{n.label}</span>
              <div
                className={`h-6 w-11 rounded-full transition ${n.on ? "bg-primary" : "bg-muted"} relative`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${n.on ? "left-5" : "left-0.5"}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Environments</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Dev", "UAT", "Prod"].map((e) => (
              <div
                key={e}
                className="rounded-2xl bg-white/50 border border-white/60 p-4 text-center"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Environment
                </div>
                <div className="mt-1 text-lg font-bold">{e}</div>
                <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
                  Healthy
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

export default SettingsPage;
