import { request } from '@/utils/request';
import type { AgentDraftTask } from '@/types/agent';

export const confirmAgentDrafts = (drafts: AgentDraftTask[]) => {
  return request.post('/agent/confirm-drafts', { drafts });
};
