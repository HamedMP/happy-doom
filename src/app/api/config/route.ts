import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasAiGateway = Boolean(process.env.VERCEL || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);

  return NextResponse.json({
    hasAiGateway,
    model: process.env.HAPPY_DOOM_MODEL ?? "openai/gpt-5.4",
    requiredEnv: ["AI_GATEWAY_API_KEY"],
    optionalEnv: ["HAPPY_DOOM_MODEL"]
  });
}
