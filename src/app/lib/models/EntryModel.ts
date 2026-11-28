import mongoose from "mongoose";
import uniqid from "uniqid";
import { JSONContent } from "@tiptap/react";
import { isSealedContent } from "@/lib/content-cipher";
import { formatEntryDateKey } from "@/lib/dates";
import { extractPlainText, RichTextNode } from "@/lib/entry-text";
import { sanitizeEntryDocument } from "@/lib/entry-document";
import { openForUser, sealForUser } from "@/lib/entry-seal";
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

async function serializeEntry(userId: string, entry: EntryRecord): Promise<EntryInterface> {
  const content =
    entry.content == null ? undefined : (await openForUser(userId, entry.content)) ?? undefined;
  if (entry.content != null && !content) {
    throw new Error("Entry content could not be opened");
  }
  return {
    id: entry.id,
    dateCreated: entry.dateCreated ?? new Date(0),
    dateUpdated: entry.dateUpdated ?? new Date(0),
    entryDate: entry.entryDate ?? "",
    userId: entry.userId ?? userId,
    content,
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
        { content: { $exists: true, $ne: null }, "content.sealed": { $ne: 2 } },
      ],
    })
    .toArray()) as {
    _id: unknown;
    content?: unknown;
    plainText?: unknown;
    hasText?: unknown;
  }[];

  for (const row of rows) {
    const version = isSealedContent(row.content) ? row.content.sealed : 0;
    const plain = row.content == null ? null : await openForUser(userId, row.content);
    if (row.content != null && !plain) {
      throw new Error("Entry content could not be opened");
    }
    const legacyText =
      typeof row.plainText === "string"
        ? row.plainText.trim()
        : extractPlainText(plain as RichTextNode | null).trim();
    const $set: Record<string, unknown> = { hasText: legacyText.length > 0 };
    if (plain && version !== 2) {
      $set.content = await sealForUser(userId, plain);
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
    entry: entry ? await serializeEntry(userId, entry) : null,
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
    const opened = await serializeEntry(userId, entry);
    stored.push({
      id: entry.id,
      entryDate: entry.entryDate,
      dateUpdated: entry.dateUpdated ?? null,
      content: opened.content,
    });
  }

  return stored;
}

function entryHasText(content: JSONContent) {
  return extractPlainText(content as RichTextNode).trim().length > 0;
}

function requireEntryDocument(content: JSONContent) {
  const clean = sanitizeEntryDocument(content);
  if (!clean) throw new Error("Entry content is invalid or too large");
  return clean;
}

export async function createEntryForDate(
  userId: string,
  entryDate: string,
  content: JSONContent
) {
  const clean = requireEntryDocument(content);
  const sealed = await sealForUser(userId, clean);
  const hasText = entryHasText(clean);
  const existing = await Entry.findOne({ userId, entryDate }).sort({
    dateUpdated: -1,
  });

  if (existing) {
    await Entry.collection.updateOne(
      { _id: existing._id },
      {
        $set: { content: sealed, hasText, dateUpdated: new Date() },
        $unset: { plainText: "" },
      }
    );
    existing.content = sealed;
    existing.dateUpdated = new Date();
    existing.hasText = hasText;
    return serializeEntry(userId, existing);
  }

  const created = await Entry.create({
    id: uniqid(),
    userId,
    entryDate,
    content: sealed,
    hasText,
    dateCreated: new Date(),
    dateUpdated: new Date(),
  });

  return serializeEntry(userId, created);
}

export async function getEntryById(id: string, userId: string) {
  const entry = await Entry.findOne({ id, userId }).lean<EntryRecord | null>();
  if (!entry) return null;
  return serializeEntry(userId, entry);
}

export async function updateEntry(id: string, userId: string, content: JSONContent) {
  const clean = requireEntryDocument(content);
  const sealed = await sealForUser(userId, clean);
  const updated = await Entry.collection.updateOne(
    { id, userId },
    {
      $set: {
        content: sealed,
        hasText: entryHasText(clean),
        dateUpdated: new Date(),
      },
      $unset: { plainText: "" },
    }
  );
  if (updated.matchedCount === 0) return null;
  return getEntryById(id, userId);
}

export function deleteEntry(id: string, userId: string) {
  return Entry.deleteOne({ id, userId });
}
