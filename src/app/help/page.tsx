"use client";

import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import {
  ArrowUpRight,
  GraduationCap,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Phone,
} from "lucide-react";

const cards = [
  {
    to: "/help/faq",
    name: "FAQ",
    desc: "Answers to common questions about projects, runs, RPA and integrations.",
    icon: HelpCircle,
    color: "from-amber-400 to-rose-500",
  },
  {
    to: "/help/tutorial",
    name: "Tutorial",
    desc: "Step-by-step walkthrough to get productive in minutes.",
    icon: GraduationCap,
    color: "from-emerald-400 to-sky-500",
  },
  {
    to: "/help/contact",
    name: "Contact",
    desc: "Reach the system owner directly via phone or email.",
    icon: Phone,
    color: "from-violet-500 to-indigo-500",
  },
] as const;

export default function HelpPage() {
  return (
    <Shell>
      <section className="rounded-3xl glass-strong p-8 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 opacity-20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center text-white shadow-lg">
            <LifeBuoy className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display">Help center</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Find answers, learn the workflow, or talk to the system owner.
            </p>
          </div>
        </div>
        <div className="relative mt-6">
          <Link
            href="/help/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg"
          >
            <MessageCircle className="h-4 w-4" /> Ask the AI Assistant
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.to} href={c.to} className="rounded-3xl glass glass-hover p-6 block group">
            <div
              className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${c.color} grid place-items-center text-white shadow-lg mb-4`}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-lg group-hover:text-primary transition">
                {c.name}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium">
              Open <ArrowUpRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </section>
    </Shell>
  );
}
