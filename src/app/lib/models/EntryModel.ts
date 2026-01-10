import mongoose from "mongoose";
import { EntryInterface } from "../types/Entry/entries";
import uniqid from "uniqid";
import { JSONContent } from "@tiptap/react";

const EntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  dateCreated: Date,
  dateUpdated: Date,
  userId: String,
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
});

const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

export function getAllEntries(userId: string) {
  return Entry.find({ userId }).sort({ dateCreated: -1 });
}

export function createEntry(
  entry: Omit<EntryInterface, "id" | "dateCreated" | "dateUpdated">
) {
  return Entry.create({
    id: uniqid(),
    dateCreated: new Date(),
    dateUpdated: new Date(),
    ...entry,
  });
}

export function getEntryById(id: string, userId: string) {
  return Entry.findOne({ id, userId });
}

export function updateEntry(id: string, userId: string, content: JSONContent) {
  return Entry.updateOne(
    { id, userId },
    { $set: { content, dateUpdated: new Date() } }
  );
}

export function deleteEntry(id: string, userId: string) {
  return Entry.deleteOne({ id, userId });
}
