// One-off frame probe (delete after use). Usage: node frame-check.mjs <seconds> <name>
import { execSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const at = Number(process.argv[2] ?? 2);
const name = process.argv[3] ?? "pipe-check";
const ROOT = "C:\\Users\\Administrator\\Videos\\spike-reel";
const transport = new StreamableHTTPClientTransport(new URL("http://127.0.0.1:60531/mcp"), {
  requestInit: { headers: { Authorization: "Bearer 1fae0cea1d7ab0f4e68ab645ef1723f9f82e065dfd515c4aa97b157726d64aca" } },
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
