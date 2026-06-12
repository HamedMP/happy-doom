import { NextResponse } from "next/server";
import { startLifeSchema } from "@/lib/game/schemas";
import { createLife } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = startLifeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lens." }, { status: 400 });
  }

  const life = createLife(parsed.data.lens);

  return NextResponse.json({ life });
}
