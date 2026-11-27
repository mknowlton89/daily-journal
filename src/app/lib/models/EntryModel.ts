import mongoose from "mongoose";
import uniqid from "uniqid";
import { JSONContent } from "@tiptap/react";
import { encryptContent, isSealedContent, type SealedContent } from "@/lib/content-cipher";
import { formatEntryDateKey } from "@/lib/dates";
import { extractPlainText, RichTextNode } from "@/lib/entry-text";
import { EntryInterface, EntryNeighbor, StoredEntry } from "../types/Entry/entries";

const EntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  dateCreated: Date,
  dateUpdated: Date,
  entryDate: String,
  hasText: Boolean,
  userId: String,
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
});

EntrySchema.index({ userId: 1, entryDate: 1 });

const cachedEntry = mongoose.models.Entry;
if (
  cachedEntry &&
  (!cachedEntry.schema.path("entryDate") ||
    !cachedEntry.schema.path("hasText") ||
    cachedEntry.schema.path("plainText"))
) {
  mongoose.deleteModel("Entry");
}

const Entry = mongoose.models.Entry || mongoose.model("Entry", EntrySchema);

type EntryRecord = {
  id: string;
  dateCreated?: Date;
  dateUpdated?: Date;
  entryDate?: string;
  hasText?: boolean;
  userId?: string;
  content?: RichTextNode;
};

const withText = { hasText: true };

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

function readableDate(entry: { entryDate?: string; dateCreated?: Date }) {
  if (entry.entryDate) return entry.entryDate;
  if (entry.dateCreated) return formatEntryDateKey(new Date(entry.dateCreated));
  return "";
}

async function sealStoredEntries(userId: string) {
  const rows = (await Entry.collection
    .find({
      userId,
      $or: [
        { plainText: { $exists: true } },
        { hasText: { $exists: false } },
        { content: { $exists: true, $ne: null }, "content.sealed": { $ne: 1 } },
      ],
    })
    .toArray()) as {
    _id: unknown;
    content?: unknown;
    plainText?: unknown;
    hasText?: unknown;
  }[];

  const key = process.env.ENTRY_CONTENT_KEY;
  for (const row of rows) {
    const sealed = isSealedContent(row.content);
    const legacyText =
      typeof row.plainText === "string"
        ? row.plainText.trim()
        : !sealed
          ? extractPlainText(row.content as RichTextNode | string | null).trim()
          : "";
    const hasText =
      typeof row.plainText === "string" || !sealed
        ? legacyText.length > 0
        : row.hasText === true;
    const $set: Record<string, unknown> = { hasText };
    if (row.content != null && !sealed) {
      if (!key) throw new Error("ENTRY_CONTENT_KEY is not configured");
      $set.content = await encryptContent(row.content as JSONContent, key);
    }
    await Entry.collection.updateOne(
      { _id: row._id as mongoose.Types.ObjectId },
      { $set, $unset: { plainText: "" } }
    );
  }
}

async function backfillEntries(userId: string) {
  const missing = await Entry.find({
    userId,
    $or: [{ entryDate: { $in: [null, ""] } }, { entryDate: { $exists: false } }],
  });

  await Promise.all(
    missing.map(async (entry) => {
      const entryDate = readableDate(entry);
      if (!entryDate || entry.entryDate === entryDate) return;
      entry.entryDate = entryDate;
      await entry.save();
    })
  );
  await sealStoredEntries(userId);
}

export async function getDayContext(userId: string, entryDate: string) {
  await backfillEntries(userId);

  const [candidates, previous, next] = await Promise.all([
    Entry.find({ userId, entryDate }).sort({ dateUpdated: -1 }),
    Entry.findOne({
      userId,
      entryDate: { $lt: entryDate },
      ...withText,
    })
      .sort({ entryDate: -1 })
      .select("id entryDate")
      .lean<EntryRecord | null>(),
    Entry.findOne({
      userId,
      entryDate: { $gt: entryDate },
      ...withText,
    })
      .sort({ entryDate: 1 })
      .select("id entryDate")
      .lean<EntryRecord | null>(),
  ]);

  const entry =
    candidates.find((item) => item.hasText) ?? candidates[0] ?? null;

  return {
    date: entryDate,
    entry: entry ? serializeEntry(entry) : null,
    previous: serializeNeighbor(previous),
    next: serializeNeighbor(next),
  };
}

export async function listEntries(userId: string): Promise<StoredEntry[]> {
  await backfillEntries(userId);

  const entries = await Entry.find({ userId, ...withText })
    .sort({ entryDate: -1, dateUpdated: -1 })
    .select("id entryDate dateUpdated content")
    .lean<EntryRecord[]>();

  const seen = new Set<string>();
  const stored: StoredEntry[] = [];

  for (const entry of entries) {
    if (!entry.entryDate || seen.has(entry.entryDate)) continue;
    seen.add(entry.entryDate);
    stored.push({
      id: entry.id,
      entryDate: entry.entryDate,
      dateUpdated: entry.dateUpdated ?? null,
      content: entry.content as StoredEntry["content"],
    });
  }

  return stored;
}

export async function createEntryForDate(
  userId: string,
  entryDate: string,
  content?: JSONContent | SealedContent,
  hasText = false
) {
  const writing = hasText === true;
  const existing = await Entry.findOne({ userId, entryDate }).sort({
    dateUpdated: -1,
  });

  if (existing) {
    if (content) {
      await Entry.collection.updateOne(
        { _id: existing._id },
        {
          $set: { content, hasText: writing, dateUpdated: new Date() },
          $unset: { plainText: "" },
        }
      );
      existing.content = content;
      existing.dateUpdated = new Date();
    }
    return serializeEntry(existing);
  }

  const created = await Entry.create({
    id: uniqid(),
    userId,
    entryDate,
    content,
    hasText: writing,
    dateCreated: new Date(),
    dateUpdated: new Date(),
  });

  return serializeEntry(created);
}

export function getEntryById(id: string, userId: string) {
  return Entry.findOne({ id, userId });
}

export function updateEntry(
  id: string,
  userId: string,
  content: JSONContent | SealedContent,
  hasText = false
) {
  return Entry.collection.updateOne(
    { id, userId },
    {
      $set: {
        content,
        hasText: hasText === true,
        dateUpdated: new Date(),
      },
      $unset: { plainText: "" },
    }
  );
}

export function deleteEntry(id: string, userId: string) {
  return Entry.deleteOne({ id, userId });
}
