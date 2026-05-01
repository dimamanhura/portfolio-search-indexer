import { MongoClient, Db } from "mongodb";

let cachedDb: Db | null = null;

export const _resetCache = () => {
  cachedDb = null;
};

export async function connectToDatabase(uri: string): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = new MongoClient(uri);

  await client.connect();

  cachedDb = client.db();

  return cachedDb;
}
