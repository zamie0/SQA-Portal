export type AdminOverview = {
  users: AdminRecord[];
  roles: AdminRole[];
  permissions: AdminPermission[];
  projects: AdminProject[];
  projectMembers: AdminProjectMember[];
  tools: AdminTool[];
  helpItems: AdminHelpItem[];
  helpFaqGroups: AdminHelpFaqGroup[];
  helpFaqItems: AdminHelpFaqItem[];
  helpTutorialSteps: AdminHelpTutorialStep[];
  helpContact: AdminHelpContact[];
  projectTools: AdminProjectTool[];
  sonarqubeConfigs: AdminSonarQubeConfig[];
  sonarqubeScans: AdminSonarQubeScan[];
  sonarqubeIssues: AdminSonarQubeIssue[];
  auditLogs: AdminAuditLog[];
};

export type AdminRecord = {
  id: string;
  [key: string]: unknown;
};

export type AdminRole = AdminRecord & {
  name?: string;
  description?: string;
  permissions?: string[];
};

export type AdminPermission = AdminRecord & {
  name?: string;
  description?: string;
};

export type AdminProject = AdminRecord & {
  name?: string;
  description?: string;
  type?: string;
  status?: string;
  link?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
};

export type AdminProjectMember = AdminRecord & {
  projectId?: string;
  userId?: string;
  role?: string;
  assignedAt?: string | number;
};

export type AdminTool = AdminRecord & {
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  url?: string;
  logoUrl?: string;
  isActive?: boolean;
  isBuiltIn?: boolean;
  source?: string;
};

export type AdminHelpItem = AdminRecord & {
  title?: string;
  slug?: string;
  description?: string;
  href?: string;
  icon?: string;
  color?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminHelpFaqGroup = AdminRecord & {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminHelpFaqItem = AdminRecord & {
  groupId?: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminHelpTutorialStep = AdminRecord & {
  title?: string;
  icon?: string;
  summary?: string;
  detail?: string[];
  sortOrder?: number;
  isActive?: boolean;
};

export type AdminHelpContact = AdminRecord & {
  name?: string;
  initials?: string;
  role?: string;
  phone?: string;
  email?: string;
  availability?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  supportMessage?: string;
};

export type AdminProjectTool = AdminRecord & {
  projectId?: string;
  toolId?: string;
  enabled?: boolean;
};

export type AdminSonarQubeConfig = AdminRecord & {
  projectId?: string;
  name?: string;
  serverUrl?: string;
  isActive?: boolean;
};

export type AdminSonarQubeScan = AdminRecord & {
  projectId?: string;
  projectName?: string;
  projectKey?: string;
  qualityGateStatus?: string;
  scannedAt?: string | number;
};

export type AdminSonarQubeIssue = AdminRecord & {
  scanId?: string;
  issueKey?: string;
  severity?: string;
  issueType?: string;
  status?: string;
  message?: string;
};

export type AdminAuditLog = AdminRecord & {
  actorId?: string | null;
  targetUserId?: string | null;
  action?: string;
  category?: string;
  status?: string;
  message?: string;
  objectType?: string;
  objectId?: string;
  objectName?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string | number;
};

export const emptyAdminOverview: AdminOverview = {
  users: [],
  roles: [],
  permissions: [],
  projects: [],
  projectMembers: [],
  tools: [],
  helpItems: [],
  helpFaqGroups: [],
  helpFaqItems: [],
  helpTutorialSteps: [],
  helpContact: [],
  projectTools: [],
  sonarqubeConfigs: [],
  sonarqubeScans: [],
  sonarqubeIssues: [],
  auditLogs: [],
};
