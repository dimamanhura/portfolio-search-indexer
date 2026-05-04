import { SearchEntityType } from "./search-entity-type";

export interface OpenSearchDocument {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  url?: string;
  image?: string;
  searchable_text: string;
}
