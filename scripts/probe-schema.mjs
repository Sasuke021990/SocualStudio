import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({ command: "node", args: ["C:\\Users\\Administrator\\AppData\\Local\\Programs\\@openreeldesktop\\resources\\app.asar.unpacked\\dist\\mcp-shim\\index.js"] });
const client = new Client({ name: "probe", version: "1.0.0" });
await client.connect(transport);
const { tools } = await client.listTools();
const t = tools.find((x) => x.name === "set_clip_transform");
console.log(JSON.stringify(t.inputSchema));
await client.close();
