import { JSONContent } from "@tiptap/react";

export interface EntryInterface {
  id: string;
  dateCreated: Date;
  dateUpdated: Date;
  userId: string;
  content?: JSONContent;
}
