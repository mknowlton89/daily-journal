import type { Session } from "next-auth";
import { createEntry, getAllEntries } from "@/app/lib/models/EntryModel";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (_session: Session) => {
  const entries = await getAllEntries();
  return Response.json(entries, { status: 200 });
});

export const POST = withAuthAndDB(
  async (_session: Session, request: Request) => {
    const body = await request.json();
    const entry = await createEntry(body);
    return Response.json(entry, { status: 201 });
  }
);
