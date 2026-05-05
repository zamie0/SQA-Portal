import type { Project } from "@/lib/mock-data";
import { MessageSquare, Link2, Plus, Send } from "lucide-react";

const linkBadge: Record<string, string> = {
  api: "bg-primary/15 text-primary",
  case: "bg-success/15 text-success",
  run: "bg-warning/15 text-warning-foreground",
};

export function DiscussionTab({ project }: { project: Project }) {
  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4">
        <div className="rounded-3xl glass p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-primary)] text-white grid place-items-center font-semibold text-sm">
              QE
            </div>
            <input
              placeholder="Start a discussion… link a test case, API or run."
              className="flex-1 bg-white/60 border border-white/70 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium">
              <Send className="h-4 w-4" /> Post
            </button>
          </div>
        </div>

        {project.discussions.map((p) => (
          <div key={p.id} className="rounded-3xl glass p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/70 border border-white/70 grid place-items-center text-sm font-semibold">
                {p.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.author}</span>
                  <span className="text-xs text-muted-foreground">· {p.date}</span>
                </div>
                <h4 className="font-display font-semibold text-lg mt-1">{p.title}</h4>
                <p className="text-sm text-muted-foreground mt-1.5">{p.body}</p>

                {p.linkedTo && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 border border-white/70">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${linkBadge[p.linkedTo.type]}`}
                    >
                      {p.linkedTo.type}
                    </span>
                    <span className="text-xs font-medium truncate">{p.linkedTo.label}</span>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-white/60 border border-white/70 text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" /> {p.replies} replies
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {project.discussions.length === 0 && (
          <div className="rounded-3xl glass p-10 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No discussions yet. Start one above.</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl glass p-6 self-start space-y-4">
        <h3 className="font-semibold">Quick link</h3>
        <p className="text-xs text-muted-foreground">
          Mention a test case, API endpoint or run in your post and it will appear here as context.
        </p>
        <button className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl glass text-sm font-medium">
          <Plus className="h-4 w-4" /> Attach context
        </button>

        <div className="border-t border-white/50 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Active contributors
          </h4>
          <div className="flex -space-x-2">
            {project.discussions.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="h-9 w-9 rounded-xl bg-white/70 border-2 border-white grid place-items-center text-xs font-semibold"
              >
                {p.initials}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
