import { SearchItemType } from "./search-item-type";

export interface OpenSearchDocument {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  searchable_text: string;
}
