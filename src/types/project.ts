import { ObjectId } from "mongodb";

// --- Nested Types ---

export interface ProjectAchievement {
  title: string;
  description: string;
}

export interface ProjectTradeOff {
  chosen: string;
  alternative: string;
  reason: string;
}

// --- Main Models ---

export interface Project {
  _id: ObjectId;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  features: string[];
  startAt: Date;
  endAt?: Date | null;
  logo?: string | null;
  position: string;
  team: string[];
  featured: boolean;
  responsibilities: string[];
  achievements: ProjectAchievement[];
  tradeOffs: ProjectTradeOff[];
  stackIds: ObjectId[]; // Stored as ObjectIds in MongoDB
  integrationIds: ObjectId[];
  toolIds: ObjectId[];
}

export interface TechStack {
  _id: ObjectId;
  title: string;
  logo?: string | null;
  type: string;
  displayOrder: number;
  featured: boolean;
  categoryId?: ObjectId | null;
  projectIds: ObjectId[];
}

export interface TechTool {
  _id: ObjectId;
  title: string;
  featured: boolean;
  type: string;
  stackId?: ObjectId | null;
  projectIds: ObjectId[];
  integrationProjectIds: ObjectId[];
}

export interface TechCategory {
  _id: ObjectId;
  title: string;
  type: string;
}
