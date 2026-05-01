import { ObjectId } from "mongodb";

export interface CompanyLocation {
  city: string;
  country: string;
}

export interface CompanyPosition {
  title: string;
  startAt: Date;
  endAt?: Date | null;
}

export interface Company {
  _id: ObjectId;
  name: string;
  startAt: Date;
  endAt?: Date | null;
  location: CompanyLocation;
  reasonsOfLeaving: string[];
  position: string;
  positions: CompanyPosition[];
  logo: string;
}
