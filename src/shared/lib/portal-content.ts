import { getMongoDb } from "./mongodb";

type MongoRecord = {
  _id?: unknown;
  [key: string]: unknown;
};

function idOf(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "toString" in value) return String(value);
  return String(value);
}

function serialize<T extends MongoRecord>(record: T) {
  const { _id, ...rest } = record;
  return {
    id: idOf(_id),
    ...rest,
  };
}

export type PortalTool = {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  url?: string;
  logoUrl?: string;
  isBuiltIn?: boolean;
  isActive?: boolean;
  source?: string;
};

export type PortalHelpItem = {
  id: string;
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

export type PortalFaqGroup = {
  id: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  items: {
    id: string;
    question?: string;
    answer?: string;
    sortOrder?: number;
    isActive?: boolean;
  }[];
};

export type PortalTutorialStep = {
  id: string;
  title?: string;
  icon?: string;
  summary?: string;
  detail?: string[];
  sortOrder?: number;
  isActive?: boolean;
};

export type PortalContactInfo = {
  id: string;
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

export async function listPortalTools() {
  const db = await getMongoDb();
  const tools = await db
    .collection<MongoRecord>("tools")
    .find({ isActive: { $ne: false }, url: { $ne: "" } })
    .sort({ isBuiltIn: -1, name: 1 })
    .toArray();

  return tools.map((tool) => serialize(tool) as PortalTool);
}

export async function listPortalHelpItems(includeInactive = false) {
  const db = await getMongoDb();
  const filter = includeInactive ? {} : { isActive: { $ne: false } };
  const helpItems = await db
    .collection<MongoRecord>("help_items")
    .find(filter)
    .sort({ sortOrder: 1, title: 1 })
    .toArray();

  return helpItems.map((helpItem) => serialize(helpItem) as PortalHelpItem);
}

export async function listPortalFaqGroups(includeInactive = false) {
  const db = await getMongoDb();
  const groupFilter = includeInactive ? {} : { isActive: { $ne: false } };
  const itemFilter = includeInactive ? {} : { isActive: { $ne: false } };
  const [groups, items] = await Promise.all([
    db
      .collection<MongoRecord>("help_faq_groups")
      .find(groupFilter)
      .sort({ sortOrder: 1, label: 1 })
      .toArray(),
    db
      .collection<MongoRecord>("help_faq_items")
      .find(itemFilter)
      .sort({ sortOrder: 1, question: 1 })
      .toArray(),
  ]);

  return groups.map((group) => {
    const serializedGroup = serialize(group);
    return {
      ...(serializedGroup as Omit<PortalFaqGroup, "items">),
      items: items
        .filter((item) => item.groupId === serializedGroup.id)
        .map((item) => serialize(item) as PortalFaqGroup["items"][number]),
    };
  });
}

export async function listPortalTutorialSteps(includeInactive = false) {
  const db = await getMongoDb();
  const filter = includeInactive ? {} : { isActive: { $ne: false } };
  const steps = await db
    .collection<MongoRecord>("help_tutorial_steps")
    .find(filter)
    .sort({ sortOrder: 1, title: 1 })
    .toArray();

  return steps.map((step) => serialize(step) as PortalTutorialStep);
}

export async function getPortalContactInfo() {
  const db = await getMongoDb();
  const contact = await db
    .collection<MongoRecord>("help_contact")
    .findOne({ _id: "primary" } as Record<string, unknown>);

  return contact ? (serialize(contact) as PortalContactInfo) : null;
}
