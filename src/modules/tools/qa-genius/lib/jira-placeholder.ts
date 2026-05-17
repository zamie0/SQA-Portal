import type { JiraUserStory } from "../types/jira";

export type JiraStoryPlaceholderResponse = {
  ok: false;
  issueKey: string;
  message: string;
  story: JiraUserStory | null;
};

export async function fetchJiraStoryPlaceholder(
  issueKey: string,
): Promise<JiraStoryPlaceholderResponse> {
  return {
    ok: false,
    issueKey,
    message:
      "Jira user story import is not implemented yet. Future MCP connector support will fetch the story and acceptance criteria without manual copy/paste.",
    story: null,
  };
}
