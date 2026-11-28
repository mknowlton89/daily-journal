import { JSONContent } from "@tiptap/react";

export interface EntryInterface {
  id: string;
  dateCreated: Date;
  dateUpdated: Date;
  entryDate: string;
  userId: string;
  content?: JSONContent;
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
  content?: JSONContent;
}

export interface EntrySummary {
  id: string;
  entryDate: string;
  dateUpdated: string;
  preview: string;
}
