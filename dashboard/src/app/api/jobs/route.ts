import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const key = process.env.LITE_AGENT_API_KEY;
  if (!key) return NextResponse.json({ error: "LITE_AGENT_API_KEY not set" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") === "completed" ? "completed" : "active";
  try {
    const r = await fetch(`https://claw-api.virtuals.io/v1/jobs/${type}`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!r.ok) throw new Error(`${r.status}`);
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}
