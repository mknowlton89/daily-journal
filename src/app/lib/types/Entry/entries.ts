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

export interface EntrySummary {
  id: string;
  entryDate: string;
  dateUpdated: string;
  preview: string;
}
