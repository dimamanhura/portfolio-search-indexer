import { ObjectId } from "mongodb";

export interface ProjectAchievement {
  title: string;
  points?: string[];
}

export interface Project {
  _id: ObjectId;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  features?: string[];
  startAt: Date | string;
  endAt?: Date | string | null;
  logo?: string;
  position: string;
  team?: string[];
  featured: boolean;
  responsibilities?: string[];
  stacks?: string[];
  tools?: string[];
  integrations?: string[];
  achievements?: ProjectAchievement[];
}
