export interface KnowledgeDocument {
  id: number;
  user_id: number;
  title: string;
  content: string;
  content_format: 'markdown';
  metadata: {
    source?: string;
    tags?: string[];
    useCase?: string;
    [key: string]: unknown;
  };
  category: string;
  created_at: string;
  updated_at: string;
}
