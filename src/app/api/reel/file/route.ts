import { NextResponse } from "next/server";
import { stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { reelWorkDir } from "@/features/reel/assets";

/** Serve the rendered reel (reel.mp4) from the post's staging directory. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const item = url.searchParams.get("item");
  if (!item || !/^[0-9a-fA-F-]{36}$/.test(item)) {
    return NextResponse.json({ error: "item parameter required" }, { status: 400 });
  }

  const filePath = join(reelWorkDir(item), "reel.mp4");
  try {
    const st = await stat(filePath);
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(st.size),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Disposition": "inline; filename=reel.mp4",
      },
    });
  } catch {
    return NextResponse.json({ error: "Reel not found" }, { status: 404 });
  }
}
