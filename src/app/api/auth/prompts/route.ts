import type { Session } from "next-auth";
import {
  getPromptLibrary,
  savePromptLibrary,
} from "@/app/lib/models/PromptLibraryModel";
import { normalizeLibrary } from "@/lib/prompts";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (session: Session) => {
  const userId = session.user?.userId;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const library = await getPromptLibrary(userId);
  return Response.json(library);
});

export const PUT = withAuthAndDB(async (session: Session, request: Request) => {
  const userId = session.user?.userId;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const library = normalizeLibrary(await request.json());
  const saved = await savePromptLibrary(userId, library);
  return Response.json(saved);
});
