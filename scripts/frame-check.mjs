// One-off frame probe (delete after use). Usage: node frame-check.mjs <seconds> <name>
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const at = Number(process.argv[2] ?? 2);
const name = process.argv[3] ?? "pipe-check";
const ROOT = "C:\\Users\\Administrator\\Videos\\spike-reel";
const transport = new StdioClientTransport({
  command: "node",
  args: ["C:\\Users\\Administrator\\AppData\\Local\\Programs\\@openreeldesktop\\resources\\app.asar.unpacked\\dist\\mcp-shim\\index.js"],
});
const client = new Client({ name: "social-studio-check", version: "1.0.0" });
await client.connect(transport);
const res = await client.callTool({
  name: "export_image_sequence",
  arguments: { format: "png", rangeStart: at, rangeEnd: at + 0.04, outputPath: `${ROOT}\\${name}.zip`, overwrite: true },
}, undefined, { timeout: 300_000 });
console.log((res.content ?? []).map((p) => (p.type === "text" ? p.text : JSON.stringify(p))).join("\n").slice(0, 120));
await client.close();
execSync(`powershell -Command "Expand-Archive '${ROOT}\\${name}.zip' '${ROOT}\\${name}' -Force"`);
