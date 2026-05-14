import Page from "@/modules/help/pages/contact-page";
import { getPortalContactInfo } from "@/shared/lib/portal-content";

export const dynamic = "force-dynamic";

export default async function ContactRoute() {
  const contact = await getPortalContactInfo();
  return <Page contact={contact} />;
}
