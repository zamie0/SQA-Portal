export type JiraAcceptanceCriteria = {
  id: string;
  text: string;
  status?: "draft" | "ready" | "verified";
};

export type JiraIssue = {
  key: string;
  summary: string;
  description?: string;
  issueType?: string;
  status?: string;
  assignee?: string;
  reporter?: string;
  labels?: string[];
  acceptanceCriteria?: JiraAcceptanceCriteria[];
};

export type JiraUserStory = JiraIssue & {
  issueType: "Story";
  userRole?: string;
  userGoal?: string;
  businessValue?: string;
};
