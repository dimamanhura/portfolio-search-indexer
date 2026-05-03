import { MongoClient, Db } from "mongodb";
import { Achievement, Project, Company, Feedback, Technology } from "./types";

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

export const getProjects = async (uri: string) => {
  const db = await connectToDatabase(uri);

  const projects = await db
    .collection("Project")
    .aggregate<Project>([
      {
        $lookup: {
          from: "TechStack",
          localField: "stackIds",
          foreignField: "_id",
          as: "stackDocs",
        },
      },
      {
        $lookup: {
          from: "TechTool",
          localField: "toolIds",
          foreignField: "_id",
          as: "toolDocs",
        },
      },
      {
        $lookup: {
          from: "TechTool",
          localField: "integrationIds",
          foreignField: "_id",
          as: "integrationDocs",
        },
      },
      {
        $addFields: {
          stacks: {
            $map: { input: "$stackDocs", as: "stack", in: "$$stack.title" },
          },
          tools: {
            $map: { input: "$toolDocs", as: "tool", in: "$$tool.title" },
          },
          integrations: {
            $map: {
              input: "$integrationDocs",
              as: "integration",
              in: "$$integration.title",
            },
          },
        },
      },
      {
        $project: {
          stackDocs: 0,
          toolDocs: 0,
          integrationDocs: 0,
        },
      },
    ])
    .toArray();

  return projects;
};

export const getCompanies = async (uri: string) => {
  const db = await connectToDatabase(uri);

  const companies = await db.collection<Company>("Company").find().toArray();

  return companies;
};

export const getFeedback = async (uri: string) => {
  const db = await connectToDatabase(uri);

  const feedback = await db.collection<Feedback>("Feedback").find().toArray();

  return feedback;
};

export const getTechnologies = async (uri: string) => {
  const db = await connectToDatabase(uri);

  const stacks = await db
    .collection("TechStack")
    .aggregate<Technology>([
      {
        $lookup: {
          from: "TechCategory",
          localField: "categoryId",
          foreignField: "_id",
          as: "categoryDoc",
        },
      },
      {
        $addFields: {
          category: { $arrayElemAt: ["$categoryDoc.title", 0] },
        },
      },
      {
        $project: { categoryDoc: 0 },
      },
    ])
    .toArray();

  const tools = await db
    .collection("TechTool")
    .aggregate<Technology>([
      {
        $lookup: {
          from: "TechStack",
          localField: "stackId",
          foreignField: "_id",
          as: "stackDoc",
        },
      },
      {
        $addFields: {
          stack: { $arrayElemAt: ["$stackDoc.title", 0] },
        },
      },
      {
        $project: { stackDoc: 0 },
      },
    ])
    .toArray();

  return [...stacks, ...tools];
};
