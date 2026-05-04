import { ObjectId } from "mongodb";

export interface Achievement {
  _id: ObjectId;
  title: string;
  description: string;
  solution: string[];
  result: string[];
  notes: string[];
  featured: boolean;
}
