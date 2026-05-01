import { ObjectId } from "mongodb";

export interface Feedback {
  _id: ObjectId;
  sectionId?: ObjectId | null;
  review: string;
  featured: boolean;
  author: string;
  receivedAt: Date;
}
