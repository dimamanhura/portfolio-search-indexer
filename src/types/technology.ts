import { ObjectId } from "mongodb";

export interface Technology {
  _id: ObjectId;
  title: string;
  type: string;
  featured: boolean;
  logo?: string;

  // Specific to Tech Stack
  category?: string;
  displayOrder?: number;

  // Specific to Tech Tool
  stack?: string;
}
