import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { findPeer } from "@/lib/peers";
import { USER_COOKIE } from "@/lib/currentUser";

const RequestSchema = z.object({ id: z.string() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = RequestSchema.parse(body);
    const peer = findPeer(id);
    if (!peer) {
      return Response.json({ error: `Unknown peer: ${id}` }, { status: 400 });
    }
    const c = await cookies();
    c.set(USER_COOKIE, id, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return Response.json({ ok: true, peer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
