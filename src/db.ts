import { MongoClient, Db } from "mongodb";
import { Achievement } from "./types";

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

export const getAchievements = async (uri: string) => {
  const db = await connectToDatabase(uri);

  const achievements = await db
    .collection<Achievement>("Achievement")
    .find()
    .toArray();

  return achievements;
};
