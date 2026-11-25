import mongoose from "mongoose";
import uniqid from "uniqid";
import { JSONContent } from "@tiptap/react";
import { formatEntryDateKey } from "@/lib/dates";
import {
  buildPreview,
  escapeRegex,
  extractPlainText,
  RichTextNode,
} from "@/lib/entry-text";
import { EntryInterface, EntryNeighbor } from "../types/Entry/entries";

const EntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  dateCreated: Date,
  dateUpdated: Date,
  entryDate: String,
  plainText: String,
  userId: String,
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
});

EntrySchema.index({ userId: 1, entryDate: 1 });

if (mongoose.models.Entry && !mongoose.models.Entry.schema.path("entryDate")) {
  mongoose.deleteModel("Entry");
}

const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

type EntryRecord = {
  id: string;
  dateCreated?: Date;
  dateUpdated?: Date;
  entryDate?: string;
  plainText?: string;
  userId?: string;
  content?: RichTextNode;
};

const hasText = { plainText: { $regex: "\\S" } };

function serializeEntry(entry: EntryRecord): EntryInterface {
  return {
    id: entry.id,
    dateCreated: entry.dateCreated ?? new Date(0),
    dateUpdated: entry.dateUpdated ?? new Date(0),
    entryDate: entry.entryDate ?? "",
    userId: entry.userId ?? "",
    content: entry.content as EntryInterface["content"],
  };
}

function serializeNeighbor(entry: EntryRecord | null): EntryNeighbor | null {
  if (!entry?.id || !entry.entryDate) return null;
  return { id: entry.id, entryDate: entry.entryDate };
}

function readableText(entry: { plainText?: string; content?: unknown }) {
  const stored = typeof entry.plainText === "string" ? entry.plainText.trim() : "";
  if (stored) return stored;
  return extractPlainText(entry.content as RichTextNode | string | null).trim();
}

function readableDate(entry: { entryDate?: string; dateCreated?: Date }) {
  if (entry.entryDate) return entry.entryDate;
  if (entry.dateCreated) return formatEntryDateKey(new Date(entry.dateCreated));
  return "";
}

async function backfillEntries(userId: string) {
  const missing = await Entry.find({
    userId,
    $or: [
      { entryDate: { $in: [null, ""] } },
      { entryDate: { $exists: false } },
      { plainText: { $in: [null, ""] } },
      { plainText: { $exists: false } },
    ],
  });

  await Promise.all(
    missing.map(async (entry) => {
      let changed = false;
      const entryDate = readableDate(entry);
      const plainText = readableText(entry);

      if (entry.entryDate !== entryDate && entryDate) {
        entry.entryDate = entryDate;
        changed = true;
      }
      if ((entry.plainText ?? "") !== plainText) {
        entry.plainText = plainText;
        changed = true;
      }
      if (changed) await entry.save();
    })
  );
}

export async function getDayContext(userId: string, entryDate: string) {
  await backfillEntries(userId);

  const [candidates, previous, next] = await Promise.all([
    Entry.find({ userId, entryDate }).sort({ dateUpdated: -1 }),
    Entry.findOne({
      userId,
      entryDate: { $lt: entryDate },
      ...hasText,
    })
      .sort({ entryDate: -1 })
      .select("id entryDate")
      .lean<EntryRecord | null>(),
    Entry.findOne({
      userId,
      entryDate: { $gt: entryDate },
      ...hasText,
    })
      .sort({ entryDate: 1 })
      .select("id entryDate")
      .lean<EntryRecord | null>(),
  ]);

  const entry =
    candidates.find((item) => item.plainText?.trim()) ?? candidates[0] ?? null;

  return {
    date: entryDate,
    entry: entry ? serializeEntry(entry) : null,
    previous: serializeNeighbor(previous),
    next: serializeNeighbor(next),
  };
}

export async function getEntrySummaries(userId: string, query?: string) {
  await backfillEntries(userId);

  const filter: Record<string, unknown> = {
    userId,
    plainText: query
      ? { $regex: escapeRegex(query), $options: "i" }
      : { $regex: "\\S" },
  };

  const entries = await Entry.find(filter)
    .sort({ entryDate: -1, dateUpdated: -1 })
    .select("id entryDate dateUpdated plainText")
    .lean<EntryRecord[]>();

  const seen = new Set<string>();
  const summaries = [];

  for (const entry of entries) {
    if (!entry.entryDate || seen.has(entry.entryDate)) continue;
    seen.add(entry.entryDate);
    summaries.push({
      id: entry.id,
      entryDate: entry.entryDate,
      dateUpdated: entry.dateUpdated ?? null,
      preview: buildPreview(entry.plainText ?? "", query),
    });
  }

  return summaries;
}

export async function createEntryForDate(
  userId: string,
  entryDate: string,
  content?: JSONContent
) {
  const plainText = extractPlainText(content);
  const existing = await Entry.findOne({ userId, entryDate }).sort({
    dateUpdated: -1,
  });

  if (existing) {
    if (content) {
      existing.content = content;
      existing.plainText = plainText;
      existing.dateUpdated = new Date();
      await existing.save();
    }
    return serializeEntry(existing);
  }

  const created = await Entry.create({
    id: uniqid(),
    userId,
    entryDate,
    content,
    plainText,
    dateCreated: new Date(),
    dateUpdated: new Date(),
  });

  return serializeEntry(created);
}

export function getEntryById(id: string, userId: string) {
  return Entry.findOne({ id, userId });
}

export function updateEntry(id: string, userId: string, content: JSONContent) {
  return Entry.updateOne(
    { id, userId },
    {
      $set: {
        content,
        plainText: extractPlainText(content),
        dateUpdated: new Date(),
      },
    }
  );
}

export function deleteEntry(id: string, userId: string) {
  return Entry.deleteOne({ id, userId });
}
