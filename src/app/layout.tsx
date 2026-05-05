import type { ReactNode } from "react";
import "../styles.css";

export const metadata = {
  title: "SQA Portal",
  description: "Modern QA platform for test automation, RPA bots, and performance testing.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
