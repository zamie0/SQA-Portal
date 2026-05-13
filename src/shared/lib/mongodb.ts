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
    throw new Error("Missing MONGODB_URI in environment variables");
  }
  return uri;
}

function getMongoDbName() {
  return process.env.MONGODB_DB || "sqa-portal";
}

export async function getMongoClient() {
  if (cache.client) return cache.client;

  if (!cache.promise) {
    cache.promise = new MongoClient(getMongoUri()).connect();
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
