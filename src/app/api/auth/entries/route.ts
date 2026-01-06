import type { Session } from "next-auth";
import { createEntry, getAllEntries } from "@/app/lib/models/EntryModel";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (session: Session) => {
  const userId = session?.user?.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const entries = await getAllEntries(userId);
  return Response.json(entries, { status: 200 });
});

export const POST = withAuthAndDB(
  async (session: Session, request: Request) => {
    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const entry = await createEntry({ ...body, userId });
    return Response.json(entry, { status: 201 });
  }
);
