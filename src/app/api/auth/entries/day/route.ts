import type { Session } from "next-auth";
import { getDayContext } from "@/app/lib/models/EntryModel";
import { isValidDateKey } from "@/lib/dates";
import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async (session: Session, request: Request) => {
  const userId = session?.user?.userId;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isValidDateKey(date)) {
    return Response.json(
      { error: "A valid date (YYYY-MM-DD) is required" },
      { status: 400 }
    );
  }

  const context = await getDayContext(userId, date);
  return Response.json(context, { status: 200 });
});
