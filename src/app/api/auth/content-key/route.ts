import { withAuthAndDB } from "@/lib/with-auth-and-db";

export const GET = withAuthAndDB(async () => {
  const key = process.env.ENTRY_CONTENT_KEY;
  if (!key) {
    return Response.json({ error: "Encryption is not configured" }, { status: 500 });
  }
  return Response.json({ key });
});
