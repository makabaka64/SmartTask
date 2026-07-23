import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Drawer, Input, Popconfirm, Segmented, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { fetchTaskList } from '@/store/modules/taskSlice';
import type { AppDispatch } from '@/store';
import type { AgentMessage, AgentRunLog, AgentType } from '@/types/agent';
import { streamAgentRun } from '@/services/agentStreamService';
import {
  confirmAgentDrafts,
  deleteAgentRun,
  getAgentRunDetail,
  getAgentRuns
} from '@/apis/agent';
import './index.scss';

const { TextArea } = Input;
const STREAM_FLUSH_INTERVAL = 80;

const agentOptions: { label: string; value: AgentType }[] = [
  { label: '任务拆解', value: 'task_planner' },
  { label: '进展摘要', value: 'progress_summary' },
  { label: '周报生成', value: 'weekly_report' }
];

const presets: Record<AgentType, string> = {
  task_planner: '帮我制定 3 周前端秋招复习计划，兼顾八股、算法、项目和 Agent 项目重构。',
  progress_summary: '帮我总结当前任务推进情况，给出风险和下一步建议。',
  weekly_report: '基于当前任务生成一份本周周报，语气简洁，适合直接发给导师。'
};

const text = {
  badge: 'Agent 工作台',
  title: '让任务系统具备可执行的 AI 助手',
  description:
    '在这里发起任务拆解、进展摘要或周报生成，重点体现结构化草案、知识增强、流式过程和确认落库闭环。',
  send: '运行 Agent',
  confirm: '确认创建任务',
  confirmed: '已创建',
  creating: '创建中...',
  placeholder: '输入目标、补充说明或希望 Agent 帮你完成的任务',
  streaming: 'Agent 正在执行...',
  idleHint: '先选择一个 Agent 类型，再输入任务目标。',
  confirmSuccess: '任务草案已写入任务系统。',
  confirmFailed: '创建失败，请稍后重试。',
  knowledgeTitle: '知识命中',
  recentRuns: '最近运行',
  noRuns: '暂无运行记录',
  runDetail: '运行详情',
  deleteRun: '删除记录',
  deleteConfirm: '确定删除这条运行记录吗？',
  summary: '结果摘要',
  input: '输入内容',
  knowledge: '命中知识',
  confirmedTasks: '创建任务 ID'
};

function createMessage(role: AgentMessage['role'], content: string, extra?: Partial<AgentMessage>): AgentMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    ...extra
  };
}

function getAgentTypeLabel(type: AgentType) {
  return agentOptions.find((item) => item.value === type)?.label || type;
}

const AgentPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [agentType, setAgentType] = useState<AgentType>('task_planner');
  const [input, setInput] = useState(presets.task_planner);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRunLog[]>([]);
  const [selectedRun, setSelectedRun] = useState<AgentRunLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const assistantChunkBufferRef = useRef('');
  const assistantFlushTimerRef = useRef<number | null>(null);
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const latestDraftMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'draft' && item.status !== 'confirmed'),
    [messages]
  );

  const latestKnowledgeMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'system' && item.knowledgeHits?.length),
    [messages]
  );

  const loadRuns = async () => {
    try {
      const res = await getAgentRuns();
      if (res.status === 0) {
        setRecentRuns(res.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadRuns();

    return () => {
      isMountedRef.current = false;
      streamAbortControllerRef.current?.abort();
      streamAbortControllerRef.current = null;
      if (assistantFlushTimerRef.current) {
        window.clearTimeout(assistantFlushTimerRef.current);
      }
      assistantFlushTimerRef.current = null;
      assistantChunkBufferRef.current = '';
    };
  }, []);

  const appendAssistantText = (content: string) => {
    if (!content) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.status === 'pending') {
        return [...prev.slice(0, -1), { ...last, content: last.content + content }];
      }
      return [...prev, createMessage('assistant', content, { status: 'pending', runId: currentRunId })];
    });
  };

  const flushAssistantBuffer = () => {
    if (assistantFlushTimerRef.current) {
      window.clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }

    const content = assistantChunkBufferRef.current;
    assistantChunkBufferRef.current = '';
    appendAssistantText(content);
  };

  const appendAssistantChunk = (chunk: string) => {
    assistantChunkBufferRef.current += chunk;
    if (assistantFlushTimerRef.current) return;

    assistantFlushTimerRef.current = window.setTimeout(() => {
      flushAssistantBuffer();
    }, STREAM_FLUSH_INTERVAL);
  };

  const finalizeAssistantMessage = () => {
    flushAssistantBuffer();
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.map((item) => item.role).lastIndexOf('assistant');
      if (lastIndex >= 0) {
        next[lastIndex] = { ...next[lastIndex], status: 'ready' };
      }
      return next;
    });
  };

  const handleRun = async () => {
    if (!input.trim() || isRunning) return;
    streamAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;
    setIsRunning(true);
    setCurrentRunId(undefined);
    assistantChunkBufferRef.current = '';
    setMessages((prev) => [...prev, createMessage('user', input)]);

    try {
      await streamAgentRun(
        agentType,
        input,
        {
          run_started: ({ runId }) => {
            setCurrentRunId(runId);
            setMessages((prev) => [...prev, createMessage('system', `本次运行 ID：${runId}`, { runId })]);
          },
          message: ({ chunk }) => appendAssistantChunk(chunk),
          tool_start: ({ message }) =>
            setMessages((prev) => [...prev, createMessage('tool', `开始执行：${message}`, { runId: currentRunId })]),
          tool_result: ({ message }) =>
            setMessages((prev) => [...prev, createMessage('tool', `执行结果：${message}`, { runId: currentRunId })]),
          knowledge_hits: ({ hits }) =>
            setMessages((prev) => [
              ...prev,
              createMessage('system', `命中 ${hits.length} 条知识片段`, {
                runId: currentRunId,
                knowledgeHits: hits
              })
            ]),
          draft: ({ drafts }) =>
            setMessages((prev) => [
              ...prev,
              createMessage('draft', '已生成任务草案，请确认后写入任务系统。', {
                drafts,
                status: 'ready',
                runId: currentRunId
              })
            ]),
          need_confirm: ({ message }) =>
            setMessages((prev) => [...prev, createMessage('system', message, { runId: currentRunId })]),
          error: ({ message, runId }) =>
            setMessages((prev) => [...prev, createMessage('error', message, { runId })]),
          done: () => finalizeAssistantMessage()
        },
        { signal: abortController.signal }
      );
    } catch (error) {
      flushAssistantBuffer();
      if (abortController.signal.aborted) return;
      console.error(error);
      setMessages((prev) => [...prev, createMessage('error', 'Agent 执行失败，请检查服务或重试。')]);
    } finally {
      flushAssistantBuffer();
      const isCurrentStream = streamAbortControllerRef.current === abortController;
      if (isCurrentStream) {
        streamAbortControllerRef.current = null;
      }
      if (isMountedRef.current && isCurrentStream) {
        setIsRunning(false);
        loadRuns();
      }
    }
  };

  const handleConfirmDrafts = async () => {
    if (!latestDraftMessage?.drafts?.length || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmAgentDrafts(latestDraftMessage.drafts, latestDraftMessage.runId);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === latestDraftMessage.id ? { ...item, status: 'confirmed', content: text.confirmSuccess } : item
        )
      );
      dispatch(fetchTaskList());
      loadRuns();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, createMessage('error', text.confirmFailed)]);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleOpenRunDetail = async (runId: string) => {
    try {
      const res = await getAgentRunDetail(runId);
      if (res.status === 0) {
        setSelectedRun(res.data);
        setDetailOpen(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    try {
      await deleteAgentRun(runId);
      if (selectedRun?.id === runId) {
        setDetailOpen(false);
        setSelectedRun(null);
      }
      loadRuns();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAgentTypeChange = (value: string | number) => {
    const nextType = value as AgentType;
    setAgentType(nextType);
    setInput(presets[nextType]);
  };

  return (
    <div className="agent-page">
      <section className="agent-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.badge}</span>
          <h2 className="hero-title">{text.title}</h2>
          <p className="hero-description">{text.description}</p>
        </div>
      </section>

      <section className="agent-workbench">
        <div className="side-stack">
          <Card className="agent-panel control-panel">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Segmented block options={agentOptions} value={agentType} onChange={handleAgentTypeChange} />
              <TextArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={6}
                placeholder={text.placeholder}
              />
              <Button type="primary" onClick={handleRun} loading={isRunning}>
                {text.send}
              </Button>
            </Space>
          </Card>

          <Card className="agent-panel run-panel" title={text.recentRuns}>
            <div className="run-list">
              {recentRuns.length === 0 ? <div className="empty-run">{text.noRuns}</div> : null}
              {recentRuns.map((run) => (
                <article key={run.id} className="run-card">
                  <div className="run-head">
                    <strong>{getAgentTypeLabel(run.agentType)}</strong>
                    <Tag color={run.status === 'confirmed' ? 'green' : run.status === 'failed' ? 'red' : 'blue'}>
                      {run.status}
                    </Tag>
                  </div>
                  <div className="run-input">{run.input}</div>
                  <div className="run-time">{dayjs(run.startedAt).format('MM-DD HH:mm')}</div>
                  {run.knowledgeHits?.length ? (
                    <div className="run-sources">
                      {run.knowledgeHits.map((hit, index) => (
                        <Tag key={`${run.id}-${index}`}>{hit.source}</Tag>
                      ))}
                    </div>
                  ) : null}
                  <div className="run-actions">
                    <Button type="link" onClick={() => handleOpenRunDetail(run.id)}>
                      {text.runDetail}
                    </Button>
                    <Popconfirm
                      title={text.deleteConfirm}
                      onConfirm={() => handleDeleteRun(run.id)}
                      okText={text.deleteRun}
                      cancelText="取消"
                    >
                      <Button type="link" danger>
                        {text.deleteRun}
                      </Button>
                    </Popconfirm>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </div>

        <Card className="agent-panel output-panel">
          <div className="panel-title-row">
            <h3>执行记录</h3>
            <Tag color={isRunning ? 'processing' : 'default'}>{isRunning ? text.streaming : 'Ready'}</Tag>
          </div>

          {latestKnowledgeMessage?.knowledgeHits?.length ? (
            <section className="knowledge-section">
              <div className="knowledge-title">{text.knowledgeTitle}</div>
              <div className="knowledge-list">
                {latestKnowledgeMessage.knowledgeHits.map((hit, index) => (
                  <article className="knowledge-card" key={`${hit.source}-${index}`}>
                    <div className="knowledge-head">
                      <strong>{hit.source}</strong>
                      <Tag>score {hit.score}</Tag>
                    </div>
                    <p>{hit.content}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="message-list">
            {messages.length === 0 && <div className="empty-state">{text.idleHint}</div>}
            {messages.map((message) => (
              <article key={message.id} className={`message-card role-${message.role}`}>
                <div className="message-role">{message.role}</div>
                <div className="message-content">{message.content}</div>

                {message.role === 'draft' && message.drafts?.length ? (
                  <div className="draft-list">
                    {message.drafts.map((draft, index) => (
                      <div className="draft-card" key={`${draft.name}-${index}`}>
                        <div className="draft-head">
                          <strong>{draft.name}</strong>
                          <Tag color={draft.priority === 'high' ? 'red' : draft.priority === 'medium' ? 'blue' : 'default'}>
                            {draft.priority}
                          </Tag>
                        </div>
                        <p>{draft.description}</p>
                        <div className="draft-meta">
                          <span>{dayjs(draft.created_at).format('MM-DD')}</span>
                          <span>{dayjs(draft.created_end).format('MM-DD')}</span>
                        </div>
                        {draft.risk ? <div className="draft-risk">风险：{draft.risk}</div> : null}
                      </div>
                    ))}
                    <Button
                      type="primary"
                      onClick={handleConfirmDrafts}
                      loading={isConfirming}
                      disabled={message.status === 'confirmed'}
                    >
                      {message.status === 'confirmed' ? text.confirmed : isConfirming ? text.creating : text.confirm}
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </Card>
      </section>

      <Drawer
        title={text.runDetail}
        open={detailOpen}
        width={480}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRun(null);
        }}
      >
        {selectedRun ? (
          <div className="run-detail">
            <div className="detail-block">
              <div className="detail-label">{text.input}</div>
              <div className="detail-content">{selectedRun.input}</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">{text.summary}</div>
              <div className="detail-content">{selectedRun.summary || '暂无摘要'}</div>
            </div>

            <div className="detail-block">
              <div className="detail-label">{text.knowledge}</div>
              <div className="detail-list">
                {selectedRun.knowledgeHits?.length ? (
                  selectedRun.knowledgeHits.map((hit, index) => (
                    <article key={`${selectedRun.id}-${index}`} className="detail-knowledge-card">
                      <div className="detail-knowledge-head">
                        <strong>{hit.source}</strong>
                        <Tag>{hit.score}</Tag>
                      </div>
                      <p>{hit.content}</p>
                    </article>
                  ))
                ) : (
                  <div className="detail-content">未命中知识片段</div>
                )}
              </div>
            </div>

            <div className="detail-block">
              <div className="detail-label">{text.confirmedTasks}</div>
              <div className="detail-content">
                {selectedRun.confirmedTaskIds?.length ? selectedRun.confirmedTaskIds.join(', ') : '无'}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default AgentPage;
