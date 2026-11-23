import { NextResponse } from "next/server";
import { getReelJob } from "@/features/reel/jobs";

/** Poll reel generation progress (see /api/reel/generate). */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("job");
  if (!id) return NextResponse.json({ error: "job parameter required" }, { status: 400 });
  const job = getReelJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}
