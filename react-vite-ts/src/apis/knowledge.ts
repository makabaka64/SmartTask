import { request } from '@/utils/request';
import type { KnowledgeDocument } from '@/types/knowledge';

export type KnowledgePayload = Pick<
  KnowledgeDocument,
  'title' | 'content' | 'category' | 'content_format' | 'metadata'
>;

export const getKnowledgeList = (): Promise<{ status: number; data: KnowledgeDocument[] }> => {
  return request.get('/knowledge/list');
};

export const createKnowledge = (data: KnowledgePayload) => {
  return request.post('/knowledge/create', data);
};

export const updateKnowledge = (id: number, data: KnowledgePayload) => {
  return request.post(`/knowledge/update/${id}`, data);
};

export const deleteKnowledge = (id: number) => {
  return request.delete(`/knowledge/delete/${id}`);
};
