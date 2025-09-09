import { MongoClient, Db } from "mongodb";

declare global {
  // allow global cache across module reloads in development
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI ?? "";
const defaultDb = process.env.MONGODB_DB ?? "photogen";

if (!uri) {
  // Intentionally not throwing here — allow runtime to decide, but warn early.
  // Many starter apps prefer a clear env var; if missing, connecting will fail later.
  // Keep this file low-risk to import.
  console.warn("MONGODB_URI not set. Set process.env.MONGODB_URI or create .env.local with it.");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable so the client is reused across HMR reloads.
  const g = global as unknown as { _mongoClientPromise?: Promise<MongoClient> };
  if (!g._mongoClientPromise) {
    client = new MongoClient(uri);
    g._mongoClientPromise = client.connect();
  }
  clientPromise = g._mongoClientPromise as Promise<MongoClient>;
} else {
  // In production, it's fine to create a new client per lambda/container start.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getMongoClient(): Promise<MongoClient> {
  return clientPromise;
}

export async function getDatabase(dbName = defaultDb): Promise<Db> {
  const c = await getMongoClient();
  return c.db(dbName);
}

export default getDatabase;

// Ensure commonly used indexes exist for the presets collection.
const _idxPromises = new Map<string, Promise<void>>();
export async function ensurePresetIndexes(dbName = defaultDb) {
  if (_idxPromises.has(dbName)) return _idxPromises.get(dbName)!;
  const p = (async () => {
    const db = await getDatabase(dbName);
    const coll = db.collection('presets');
    await Promise.all([
      coll.createIndex({ createdAt: -1 }),
      coll.createIndex({ name: 1 }),
      coll.createIndex({ tags: 1 }),
      coll.createIndex({ name: 'text', description: 'text', tags: 'text' }, { name: 'presets_text_idx' }),
    ]);
  })();
  _idxPromises.set(dbName, p);
  return p;
}
