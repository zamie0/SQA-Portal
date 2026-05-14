import { MongoClient, type Db } from "mongodb";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as typeof globalThis & {
  __sqaMongo?: MongoCache;
};

const cache = globalWithMongo.__sqaMongo ?? {};
globalWithMongo.__sqaMongo = cache;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI in environment variables. Add it to .env.local in the project root.",
    );
  }
  return uri;
}

function getMongoDbName() {
  const explicitName = process.env.MONGODB_DB?.trim();
  if (explicitName) return explicitName;

  const uri = getMongoUri();

  try {
    const parsed = new URL(uri);
    const fromPath = parsed.pathname.replace(/^\/+/, "").trim();
    if (fromPath) return decodeURIComponent(fromPath);
  } catch {
    // Fall through to the default below if the URI cannot be parsed.
  }

  return "sqa_portal";
}

function mongoTargetLabel(uri: string) {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  } catch {
    return "the configured MongoDB server";
  }
}

function normalizeMongoError(error: unknown, uri: string) {
  if (!(error instanceof Error)) {
    return new Error("MongoDB connection failed for an unknown reason.");
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("econnrefused") ||
    message.includes("server selection timed out") ||
    message.includes("connect etimedout")
  ) {
    return new Error(
      `MongoDB is configured but not reachable at ${mongoTargetLabel(
        uri,
      )}. Make sure the local MongoDB service is running on Windows, then restart the app.`,
    );
  }

  return new Error(`MongoDB connection failed: ${error.message}`);
}

export async function getMongoClient() {
  if (cache.client) return cache.client;

  if (!cache.promise) {
    const uri = getMongoUri();
    cache.promise = new MongoClient(uri).connect().catch((error) => {
      cache.promise = undefined;
      throw normalizeMongoError(error, uri);
    });
  }

  cache.client = await cache.promise;
  return cache.client;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getMongoDbName());
}

export async function pingMongoDb() {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
  return {
    database: db.databaseName,
  };
}
