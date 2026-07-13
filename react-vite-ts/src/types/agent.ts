export type AgentType = 'task_planner' | 'progress_summary' | 'weekly_report';

export interface AgentDraftTask {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  risk?: string;
  created_at: string;
  created_end: string;
  status?: number;
}

export interface AgentStreamEventMap {
  message: { chunk: string };
  tool_start: { tool: string; message: string };
  tool_result: { tool: string; message: string };
  draft: { drafts: AgentDraftTask[] };
  need_confirm: { message: string };
  done: { ok: boolean };
  error: { message: string };
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'draft' | 'system' | 'error';
  content: string;
  status?: 'pending' | 'ready' | 'confirmed';
  drafts?: AgentDraftTask[];
}
