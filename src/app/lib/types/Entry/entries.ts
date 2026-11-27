import { JSONContent } from "@tiptap/react";
import type { SealedContent } from "@/lib/content-cipher";

export interface EntryInterface {
  id: string;
  dateCreated: Date;
  dateUpdated: Date;
  entryDate: string;
  userId: string;
  content?: JSONContent | SealedContent;
}

export interface EntryNeighbor {
  id: string;
  entryDate: string;
}

export interface DayContext {
  date: string;
  entry: EntryInterface | null;
  previous: EntryNeighbor | null;
  next: EntryNeighbor | null;
}

export interface StoredEntry {
  id: string;
  entryDate: string;
  dateUpdated: Date | string | null;
  content?: JSONContent | SealedContent;
}

export interface EntrySummary {
  id: string;
  entryDate: string;
  dateUpdated: string;
  preview: string;
}
