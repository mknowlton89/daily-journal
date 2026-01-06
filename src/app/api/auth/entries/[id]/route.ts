import type { Session } from "next-auth";
import { getEntryById } from "@/app/lib/models/EntryModel";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(
  async (
    session: Session,
    _request: Request,
    params: Promise<{ [key: string]: string }>
  ) => {
    const { id } = await params;

    if (!id) {
      return Response.json({ error: "Missing entry id" }, { status: 400 });
    }

    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entry = await getEntryById(id, userId);
    return Response.json(entry, { status: 200 });
  }
);
