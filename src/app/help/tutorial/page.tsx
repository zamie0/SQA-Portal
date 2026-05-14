import Page from "@/modules/help/pages/tutorial-page";
import { listPortalTutorialSteps } from "@/shared/lib/portal-content";

export const dynamic = "force-dynamic";

export default async function TutorialRoute() {
  const tutorialSteps = await listPortalTutorialSteps();
  return <Page tutorialSteps={tutorialSteps} />;
}
