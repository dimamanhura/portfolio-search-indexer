import { ObjectId } from "mongodb";

export interface Feedback {
  _id: ObjectId;
  section?: string;
  review: string;
  featured: boolean;
  author: string;
  receivedAt: Date | string;
}
