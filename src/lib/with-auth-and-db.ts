import type { Session } from "next-auth";
import { connectDB } from "@/app/lib/mongodb";
import { requireSession } from "@/lib/require-session";

export type HandlerWithRequest = (
  session: Session,
  request: Request
) => Promise<Response>;

export type HandlerWithoutRequest = (session: Session) => Promise<Response>;

/**
 * Wraps a route handler with database connection and authentication.
 * Use this for GET handlers (no request parameter).
 *
 * @param handler - The route handler function that receives (session) and returns Response
 * @returns A GET route handler function compatible with Next.js App Router
 */
export function withAuthAndDB(
  handler: HandlerWithoutRequest
): () => Promise<Response>;

/**
 * Wraps a route handler with database connection and authentication.
 * Use this for POST/PUT/DELETE handlers (with request parameter).
 *
 * @param handler - The route handler function that receives (session, request) and returns Response
 * @returns A POST/PUT/DELETE route handler function compatible with Next.js App Router
 */
export function withAuthAndDB(
  handler: HandlerWithRequest
): (request: Request) => Promise<Response>;

export function withAuthAndDB(
  handler: HandlerWithRequest | HandlerWithoutRequest
): (request?: Request) => Promise<Response> {
  return async (request?: Request): Promise<Response> => {
    try {
      // Connect to database
      await connectDB();

      // Get authenticated session
      const session = await requireSession();
      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Call the handler with session and request (if provided)
      if (request !== undefined) {
        return await (handler as HandlerWithRequest)(session, request);
      } else {
        return await (handler as HandlerWithoutRequest)(session);
      }
    } catch (error) {
      console.error("API route error:", error);
      return Response.json(
        { message: "Internal server error", error: String(error) },
        { status: 500 }
      );
    }
  };
}
