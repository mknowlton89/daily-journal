import type { Session } from "next-auth";
import {
  deleteEntry,
  getEntryById,
  updateEntry,
} from "@/app/lib/models/EntryModel";
import { sanitizeEntryDocument } from "@/lib/entry-document";
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

export const PUT = withAuthAndDB(
  async (
    session: Session,
    request: Request,
    params: Promise<{ [key: string]: string }>
  ) => {
    const { id } = await params;
    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const content = sanitizeEntryDocument(body?.content);
    if (!content) {
      return Response.json(
        { error: "Entry content is invalid or too large" },
        { status: 400 }
      );
    }
    const entry = await updateEntry(id, userId, content);
    if (!entry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }
    return Response.json(entry, { status: 200 });
  }
);

export const DELETE = withAuthAndDB(
  async (
    session: Session,
    _request: Request,
    params: Promise<{ [key: string]: string }>
  ) => {
    const { id } = await params;
    const userId = session?.user?.userId;
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    await deleteEntry(id, userId);
    return Response.json({ status: 204 });
  }
);
