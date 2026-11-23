import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({ command: "node", args: ["C:\\Users\\Administrator\\AppData\\Local\\Programs\\@openreeldesktop\\resources\\app.asar.unpacked\\dist\\mcp-shim\\index.js"] });
const client = new Client({ name: "probe", version: "1.0.0" });
await client.connect(transport);
const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 });
  return (res.content ?? []).map((p) => (p.type === "text" ? p.text : JSON.stringify(p))).join("\n");
};
await call("create_project", { name: "TV2", width: 1080, height: 1920, frameRate: 30 });
const imp = await call("import_media_from_path", { paths: ["C:\\Users\\Administrator\\Videos\\SocialStudio\\38afe672-a1bf-43cf-aa43-459b8cde8250\\img0.png"] });
const mediaId = JSON.parse(imp.slice(imp.indexOf("{"))).imported[0].mediaId;
const tr = await call("add_track", { trackType: "video", position: 0 });
const trackId = "track-" + JSON.parse(tr.slice(tr.indexOf("{"))).actionId + "-0";
const cl = await call("add_clip", { trackId, mediaId, startTime: 0 });
const clipId = JSON.parse(cl.slice(cl.indexOf("{"))).actionId + "-0";

const variants = {
  full: { clipId, transform: { position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, opacity: 1, fitMode: "cover" } },
  fitOnly: { clipId, transform: { fitMode: "cover" } },
  scaleOnly: { clipId, transform: { scale: { x: 1.5, y: 1.5 } } },
  stringTransform: { clipId, transform: "{\"fitMode\":\"cover\"}" },
};
for (const [k, v] of Object.entries(variants)) {
  console.log(k, "->", (await call("set_clip_transform", v)).slice(0, 120).replace(/\n/g, " "));
}
console.log("final:", (await call("get_clip", { clipId })).match(/"transform"[\s\S]{0,200}/)?.[0]);
await client.close();
