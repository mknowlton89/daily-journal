import type { Session } from "next-auth";
import {
  createEntryForDate,
  getEntrySummaries,
} from "@/app/lib/models/EntryModel";
import { isValidDateKey } from "@/lib/dates";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (session: Session, request: Request) => {
  const userId = session?.user?.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const entries = await getEntrySummaries(userId, query.slice(0, 100) || undefined);
  return Response.json(entries, { status: 200 });
});

export const POST = withAuthAndDB(
  async (session: Session, request: Request) => {
    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entryDate = typeof body.entryDate === "string" ? body.entryDate : "";
    if (!isValidDateKey(entryDate)) {
      return Response.json(
        { error: "A valid entryDate (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const entry = await createEntryForDate(userId, entryDate, body.content);
    return Response.json(entry, { status: 201 });
  }
);
