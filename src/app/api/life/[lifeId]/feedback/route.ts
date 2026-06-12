import { NextResponse } from "next/server";
import { feedbackRequestSchema } from "@/lib/game/schemas";
import { setFeedback } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ lifeId: string }> }) {
  const { lifeId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = feedbackRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const event = setFeedback(lifeId, parsed.data.eventId, parsed.data.rating);

  return NextResponse.json({ event });
}
