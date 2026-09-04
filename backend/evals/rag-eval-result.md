# RAG Evaluation Result

Command:

```bash
npm run seed:rag-eval -- --user-id 1
npm run eval:rag -- --user-id 1 --top-k 3 --candidate-limit 20
npm run eval:rag -- --user-id 1 --top-k 5 --candidate-limit 20
```

Dataset:

- Knowledge documents: 8 Markdown documents
- Query count: 42
- Agent types: `task_planner`, `progress_summary`, `weekly_report`
- Queries per agent type: 14
- Scope: task planning, progress summary, weekly report generation, project context, collaboration/risk rules, acceptance testing, scheduling/priority rules

Annotation:

- Each case contains `agentType`, `query`, `expectedSources`, and `expectedKeywords`.
- A returned chunk is treated as relevant if its `source` matches an expected source, or if its `source + sectionPath + content` contains one of the expected keywords.
- This evaluates retrieval quality, not final LLM answer quality.

Latest Result:

| Stage | Recall@3 | MRR@3 | Recall@5 | MRR@5 |
| --- | ---: | ---: | ---: | ---: |
| Vector retrieval | 92.86% | 0.8611 | 97.62% | 0.8718 |
| Keyword retrieval | 97.62% | 0.9127 | 100.00% | 0.9187 |
| Hybrid candidates | 92.86% | 0.8611 | 97.62% | 0.8718 |
| Hybrid + qwen3-rerank | 97.62% | 0.9484 | 100.00% | 0.9544 |

Agent Type Breakdown:

| Agent type | Queries | Rerank Recall@3 | Rerank MRR@3 | Rerank Recall@5 | Rerank MRR@5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `weekly_report` | 14 | 100.00% | 0.9643 | 100.00% | 0.9643 |
| `task_planner` | 14 | 92.86% | 0.8810 | 100.00% | 0.8988 |
| `progress_summary` | 14 | 100.00% | 1.0000 | 100.00% | 1.0000 |

Rerank Impact:

- Top-3: hybrid candidates Recall@3/MRR@3 = 92.86%/0.8611; after `qwen3-rerank` = 97.62%/0.9484.
- Top-5: hybrid candidates Recall@5/MRR@5 = 97.62%/0.8718; after `qwen3-rerank` = 100.00%/0.9544.
- Example improvement: case #2 moved from rank 4 before rerank to rank 1 after rerank.
- Example improvement: case #21 was not found in vector/hybrid Top-K, but keyword retrieval plus rerank recovered it to rank 1.
- Example tradeoff: case #15 passed at Top-5 but failed at Top-3 after rerank, showing that rerank can improve overall ordering while still needing harder-case tuning.

Failure Cases:

- Rerank Top-3 has one failed case: #15 (`task_planner`) about "上线前异常处理补充工作". The relevant chunk was in the candidate set before rerank, but moved outside Top-3 after rerank.
- Rerank Top-5 has no failed cases in the current 42-query eval set.
- Vector/hybrid retrieval still misses some broader progress-summary queries, which shows why keyword retrieval is useful as a complementary recall path.

Notes:

- This is a small, manually annotated eval set aligned with the three Agent scenarios, not a broad production benchmark.
- Current results prove that the RAG retrieval path, Qdrant vector retrieval, keyword retrieval, candidate merge, and qwen3-rerank stage are runnable and measurable.
- For a stronger benchmark, add more real user documents, negative cases, ambiguous references, near-duplicate chunks, and answer-level faithfulness checks.
