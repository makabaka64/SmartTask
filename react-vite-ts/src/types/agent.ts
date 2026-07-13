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

export interface AgentKnowledgeHit {
  source: string;
  content: string;
  score: number;
}

export interface AgentRunLog {
  id: string;
  userId: number;
  agentType: AgentType;
  input: string;
  status: 'running' | 'completed' | 'failed' | 'confirmed';
  startedAt: string;
  completedAt: string | null;
  knowledgeHits: AgentKnowledgeHit[];
  draftCount: number;
  summary: string;
  confirmedTaskIds?: number[];
}

export interface AgentStreamEventMap {
  run_started: { runId: string; startedAt: string };
  message: { chunk: string };
  tool_start: { tool: string; message: string };
  tool_result: { tool: string; message: string };
  knowledge_hits: { hits: AgentKnowledgeHit[] };
  draft: { drafts: AgentDraftTask[] };
  need_confirm: { message: string };
  done: { ok: boolean; runId: string; draftCount: number };
  error: { message: string; runId?: string };
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'draft' | 'system' | 'error';
  content: string;
  status?: 'pending' | 'ready' | 'confirmed';
  drafts?: AgentDraftTask[];
  runId?: string;
  knowledgeHits?: AgentKnowledgeHit[];
}
