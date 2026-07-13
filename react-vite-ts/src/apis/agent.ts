import { request } from '@/utils/request';
import type { AgentDraftTask, AgentRunLog } from '@/types/agent';

export const confirmAgentDrafts = (drafts: AgentDraftTask[], runId?: string) => {
  return request.post('/agent/confirm-drafts', { drafts, runId });
};

export const getAgentRuns = (): Promise<{ status: number; data: AgentRunLog[] }> => {
  return request.get('/agent/runs');
};

export const getAgentRunDetail = (id: string): Promise<{ status: number; data: AgentRunLog }> => {
  return request.get(`/agent/runs/${id}`);
};

export const deleteAgentRun = (id: string) => {
  return request.delete(`/agent/runs/${id}`);
};
