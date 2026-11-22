export type McpTransport = "stdio" | "http";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  /** stdio only */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** http only */
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface McpStageConfig {
  brandExtraction: boolean;
  research: boolean;
  contentGeneration: boolean;
}

export type McpStage = keyof McpStageConfig;

export interface McpConfig {
  servers: McpServerConfig[];
  stages: McpStageConfig;
}

export interface McpToolInfo {
  /** Namespaced name: `servername__toolname` */
  name: string;
  description: string;
  serverId: string;
  serverName: string;
}

export const EMPTY_MCP_CONFIG: McpConfig = {
  servers: [],
  stages: { brandExtraction: false, research: false, contentGeneration: false },
};
