import Page from "@/modules/help/pages/faq-page";
import { listPortalFaqGroups } from "@/shared/lib/portal-content";

export const dynamic = "force-dynamic";

export default async function FaqRoute() {
  const faqGroups = await listPortalFaqGroups();
  return <Page faqGroups={faqGroups} />;
}
