import type { Project } from "@/lib/mock-data";
import { Github, GitBranch, Webhook, Server, KeyRound } from "lucide-react";

export function SettingsTab({ project }: { project: Project }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">Project info</h3>
        <div className="space-y-3">
          <Field label="Name">
            <input
              defaultValue={project.name}
              className="w-full bg-white/60 border border-white/70 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Description">
            <textarea
              defaultValue={project.description}
              rows={3}
              className="w-full bg-white/60 border border-white/70 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </Field>
          <Field label="Type">
            <div className="flex gap-2">
              {(["Test Automation", "RPA"] as const).map((t) => (
                <span
                  key={t}
                  className={`text-xs px-3 py-1.5 rounded-full ${
                    project.type === t
                      ? "bg-foreground text-background"
                      : "bg-white/60 border border-white/70 text-muted-foreground"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">Environment variables</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Defaults inherited by every environment. Override per-env in the Web tab.
        </p>
        <div className="space-y-2">
          {[
            { k: "BASE_URL", v: project.environments[0]?.baseUrl ?? "" },
            { k: "API_KEY", v: "••••••••", secret: true },
            { k: "TIMEOUT_MS", v: "30000" },
          ].map((row) => (
            <div
              key={row.k}
              className="grid grid-cols-[140px_1fr_auto] items-center gap-2 p-2 rounded-xl bg-white/60 border border-white/70"
            >
              <span className="text-xs font-mono font-semibold truncate">{row.k}</span>
              <span className="text-xs font-mono text-muted-foreground truncate">{row.v}</span>
              {row.secret && <KeyRound className="h-3.5 w-3.5 text-warning-foreground" />}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">Framework configuration</h3>
        <pre className="rounded-xl bg-foreground text-background/95 text-xs font-mono p-4 overflow-x-auto">
          {`# automation.config
runner: playwright
parallelWorkers: 4
retry: 1
selenium:
  hub: http://grid:4444/wd/hub
appium:
  serverUrl: http://appium:4723`}
        </pre>
      </div>

      <div className="rounded-3xl glass p-6">
        <h3 className="font-semibold mb-4">CI/CD integration</h3>
        <div className="space-y-2">
          {[
            { icon: Github, name: "GitHub Actions", desc: "Trigger on push to main", on: true },
            { icon: GitBranch, name: "Jenkins", desc: "Job: qe-automation-nightly", on: true },
            { icon: Webhook, name: "GitLab CI", desc: "Pipeline webhook", on: false },
            { icon: Server, name: "Self-hosted runner", desc: "runner-eu-west-1", on: true },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70"
              >
                <div className="h-10 w-10 rounded-xl bg-white/80 border border-white/70 grid place-items-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.on ? "Connected" : "Off"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
