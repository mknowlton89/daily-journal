import type { Session } from "next-auth";
import {
  createEntryForDate,
  listEntries,
} from "@/app/lib/models/EntryModel";
import { isValidDateKey } from "@/lib/dates";
import { sanitizeEntryDocument } from "@/lib/entry-document";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (session: Session) => {
  const userId = session?.user?.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await listEntries(userId);
  return Response.json(entries, { status: 200 });
});

export const POST = withAuthAndDB(
  async (session: Session, request: Request) => {
    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entryDate = typeof body?.entryDate === "string" ? body.entryDate : "";
    if (!isValidDateKey(entryDate)) {
      return Response.json(
        { error: "A valid entryDate (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const content = sanitizeEntryDocument(body?.content);
    if (!content) {
      return Response.json(
        { error: "Entry content is invalid or too large" },
        { status: 400 }
      );
    }
    const entry = await createEntryForDate(userId, entryDate, content);
    return Response.json(entry, { status: 201 });
  }
);
