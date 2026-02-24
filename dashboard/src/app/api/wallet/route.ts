import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.LITE_AGENT_API_KEY;
  if (!key) return NextResponse.json({ error: "LITE_AGENT_API_KEY not set" }, { status: 500 });
  try {
    const r = await fetch("https://claw-api.virtuals.io/v1/wallet/balance", {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!r.ok) throw new Error(`${r.status}`);
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}
