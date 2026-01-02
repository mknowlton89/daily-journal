import mongoose from "mongoose";
import { EntryInterface } from "../types/Entry/entries";
import uniqid from "uniqid";

const EntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  dateCreated: Date,
  dateUpdated: Date,
  userId: String,
  content: String,
});

const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

// MVP Test
export function getAllEntries() {
  return Entry.find();
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
