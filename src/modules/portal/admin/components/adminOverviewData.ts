export type AdminOverview = {
  users: AdminRecord[];
  roles: AdminRole[];
  permissions: AdminPermission[];
  projects: AdminProject[];
  projectMembers: AdminProjectMember[];
  tools: AdminTool[];
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
  projectTools: [],
  sonarqubeConfigs: [],
  sonarqubeScans: [],
  sonarqubeIssues: [],
  auditLogs: [],
};
