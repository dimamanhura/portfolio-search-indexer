import { ObjectId } from "mongodb";

export interface CompanyLocation {
  city: string;
  country: string;
}

export interface CompanyPosition {
  title: string;
  startAt: Date | string;
  endAt?: Date | string | null;
}

export interface Company {
  _id: ObjectId;
  name: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  location: CompanyLocation;
  reasonsOfLeaving?: string[];
  position: string;
  positions?: CompanyPosition[];
  logo?: string;
}
