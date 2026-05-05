export interface Notification {
  id: string;
  title: string;
  body: string;
  kind: "fail" | "pass" | "forum" | "schedule";
  date: string;
  href?: string;
  read?: boolean;
}

export const seedNotifications: Notification[] = [
  {
    id: "n1",
    title: "Test failed: TM-003",
    body: "Export weekly report — 500 from /v1/reports/weekly on UAT.",
    kind: "fail",
    date: "12 min ago",
    href: "/projects/tmforce",
  },
  {
    id: "n2",
    title: "Run completed: API regression #211",
    body: "INTT • 284 passed • 8 failed • 6m 22s",
    kind: "pass",
    date: "1 h ago",
    href: "/projects/intt",
  },
  {
    id: "n3",
    title: "New reply on “Payment retry timeouts”",
    body: "Aiden K. replied in INTT discussion thread.",
    kind: "forum",
    date: "2 h ago",
    href: "/projects/intt",
  },
  {
    id: "n4",
    title: "Scheduled run starting in 30 min",
    body: "Camelia • Daily ledger reconciliation",
    kind: "schedule",
    date: "Today, 06:00",
    href: "/schedule",
  },
];
