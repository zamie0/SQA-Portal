import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { listPortalHelpItems, type PortalHelpItem } from "@/shared/lib/portal-content";
import {
  ArrowUpRight,
  GraduationCap,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Phone,
} from "lucide-react";

const helpIcons = {
  "graduation-cap": GraduationCap,
  "help-circle": HelpCircle,
  "life-buoy": LifeBuoy,
  "message-circle": MessageCircle,
  phone: Phone,
} as const;

function helpView(item: PortalHelpItem) {
  return {
    to: item.href || "/help",
    name: item.title || "Untitled help item",
    desc: item.description || "No description available.",
    icon: helpIcons[item.icon as keyof typeof helpIcons] ?? LifeBuoy,
    color: item.color || "from-sky-500 to-cyan-500",
  };
}

export default async function HelpPage() {
  const cards = await listPortalHelpItems();
  const primaryCards = cards.map(helpView);

  return (
    <Shell>
      <section className="mb-6 overflow-hidden rounded-3xl glass-strong">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="flex min-w-0 flex-col justify-between gap-8">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-white shadow-lg">
                <LifeBuoy className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Support center
                </div>
                <h1 className="text-3xl font-bold font-display md:text-4xl">Help center</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                  Choose a support path, learn the workflow, or reach the team when you need a human
                  answer.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="text-2xl font-semibold">{cards.length}</div>
                <div className="text-xs text-muted-foreground">Published paths</div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="text-2xl font-semibold">24/7</div>
                <div className="text-xs text-muted-foreground">AI assistant</div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="text-2xl font-semibold">Live</div>
                <div className="text-xs text-muted-foreground">Admin-managed</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-sm">
            <Link
              href="/help/chat"
              className="flex items-center justify-between rounded-2xl bg-[image:var(--gradient-primary)] px-4 py-4 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl"
            >
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> Ask SQA Copilot
              </span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Good for quick explanations, workflow reminders, and finding the right place to go
              next.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.length === 0 && (
          <div className="rounded-3xl glass p-6 text-sm text-muted-foreground md:col-span-3">
            No active help items found in the database yet.
          </div>
        )}
        {primaryCards.map((card) => (
          <Link
            key={card.to}
            href={card.to}
            className="group flex min-h-52 flex-col justify-between rounded-3xl glass glass-hover p-6"
          >
            <div>
              <div
                className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg`}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <div className="text-lg font-semibold transition group-hover:text-primary">
                {card.name}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
            <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open <ArrowUpRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </section>
    </Shell>
  );
}
