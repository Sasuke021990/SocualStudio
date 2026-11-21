import { NextResponse } from "next/server";

/** Proxy ComfyUI /view images so the browser can load them without CORS issues. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Only allow ComfyUI URLs (prevent SSRF)
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    return NextResponse.json({ error: "Only local ComfyUI URLs allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      return NextResponse.json({ error: `ComfyUI returned ${res.status}` }, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
