"use client";

import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { Phone, Mail, Clock, Briefcase, MessageCircle, Github, Linkedin } from "lucide-react";
import type { PortalContactInfo } from "@/shared/lib/portal-content";

const fallbackContact = {
  name: "Hazami",
  initials: "HZ",
  role: "System Developer & Owner",
  phone: "+60 19-736 6813",
  email: "muhdhazami157@gmail.com",
  availability: "Mon - Fri / 9:00 AM - 6:00 PM (GMT+8)",
  githubUrl: "https://github.com/zamie0",
  linkedinUrl: "https://www.linkedin.com/in/muhd-hazami-3a84112a2/",
  supportMessage: "For bug reports, account help, feature requests or anything else about QE Hub.",
};

function ContactPage({ contact }: { contact: PortalContactInfo | null }) {
  const CONTACT = { ...fallbackContact, ...contact };

  return (
    <Shell>
      <div className="rounded-3xl glass-strong p-6 mb-4 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-300 to-sky-400 opacity-25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center text-white shadow-lg">
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Contact the system owner</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                {CONTACT.supportMessage}
              </p>
            </div>
          </div>
          <Link
            href="/help/chat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm font-medium"
          >
            <MessageCircle className="h-4 w-4" /> Try AI first
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        {/* Contact card */}
        <div className="rounded-3xl glass p-6 flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-3xl bg-[image:var(--gradient-primary)] grid place-items-center text-white text-3xl font-bold shadow-lg">
            {CONTACT.initials}
          </div>
          <h2 className="mt-4 text-2xl font-bold">{CONTACT.name}</h2>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-1">
            <Briefcase className="h-3.5 w-3.5" /> {CONTACT.role}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-success/15 text-success font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Available now
          </div>

          <div className="w-full mt-6 space-y-2">
            <a
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[image:var(--gradient-primary)] text-white py-2.5 text-sm font-medium shadow-lg"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="w-full flex items-center justify-center gap-2 rounded-xl glass-strong py-2.5 text-sm font-medium"
            >
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>

          <div className="mt-5 flex gap-2">
            {CONTACT.githubUrl && (
              <a
                href={CONTACT.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 grid place-items-center rounded-xl bg-white/60 border border-white/70"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            )}

            {CONTACT.linkedinUrl && (
              <a
                href={CONTACT.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 w-9 grid place-items-center rounded-xl bg-white/60 border border-white/70"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Details + form */}
        <div className="space-y-4">
          <div className="rounded-3xl glass p-6">
            <h3 className="font-semibold mb-4">Details</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Detail
                icon={Phone}
                label="Phone"
                value={CONTACT.phone}
                href={`tel:${CONTACT.phone}`}
              />
              <Detail
                icon={Mail}
                label="Email"
                value={CONTACT.email}
                href={`mailto:${CONTACT.email}`}
              />
              <Detail icon={Briefcase} label="Role" value={CONTACT.role} />
              <Detail icon={Clock} label="Availability" value={CONTACT.availability} />
            </div>
          </div>

          <div className="rounded-3xl glass p-6">
            <h3 className="font-semibold mb-1">Send a quick message</h3>
            <ContactForm contact={CONTACT} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/60 border border-white/70 hover:bg-white transition">
      <div className="h-9 w-9 grid place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-white shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function ContactForm({ contact }: { contact: typeof fallbackContact }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const subject = encodeURIComponent(
          (f.elements.namedItem("subject") as HTMLInputElement)?.value || "QE Hub message",
        );
        const body = encodeURIComponent(
          (f.elements.namedItem("message") as HTMLTextAreaElement)?.value || "",
        );
        window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
      }}
      className="space-y-3"
    >
      <input
        name="subject"
        placeholder="Subject"
        className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/70 outline-none focus:border-primary text-sm"
      />
      <textarea
        name="message"
        rows={5}
        placeholder={`Tell ${contact.name} what's on your mind...`}
        className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-white/70 outline-none focus:border-primary text-sm resize-none"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-medium shadow-lg"
      >
        <Mail className="h-4 w-4" /> Send email
      </button>
    </form>
  );
}

export default ContactPage;
