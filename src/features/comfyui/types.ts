export interface ComfyUIConnection {
  id: string;
  name: string;
  baseUrl: string;
  connected: boolean;
  workflowName: string | null;
  workflowJson: Record<string, unknown> | null;
  lastTestedAt: string | null;
}

export interface ComfyUIState {
  connections: ComfyUIConnection[];
  activeId: string | null;
}

export interface ComfyUITestResult {
  ok: boolean;
  message: string;
  version?: string;
}
