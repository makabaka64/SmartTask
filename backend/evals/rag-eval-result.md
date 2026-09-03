# RAG Evaluation Result

Command:

```bash
npm run eval:rag -- --user-id 1 --top-k 5 --candidate-limit 20
```

Dataset:

- File: `backend/evals/rag-eval-set.json`
- Query count: 15
- Scope: weekly report template knowledge document

Latest result:

| Stage | Recall@5 | MRR@5 |
| --- | ---: | ---: |
| Vector retrieval | 100.00% | 1.0000 |
| Keyword retrieval | 100.00% | 1.0000 |
| Hybrid candidates | 100.00% | 1.0000 |
| Hybrid + rerank | 100.00% | 1.0000 |

Notes:

- The current default eval set is intentionally aligned with the existing local knowledge base, which contains one weekly report template document split into five chunks.
- The result verifies that the RAG pipeline can retrieve the expected source and section from Qdrant and keyword retrieval.
- This result should not be described as a broad production benchmark. For a stronger benchmark, add more documents and expand the eval set to cover different categories, ambiguous queries, exact keyword queries, and negative cases.
- During the latest run, rerank used Alibaba Bailian `qwen3-rerank`; result rows returned `qwen3-rerank relevance score`. Local heuristic rerank remains as a fallback when the rerank API is unavailable.
