import { useMemo, useState } from 'react';
import { Button, Card, Input, Segmented, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { fetchTaskList } from '@/store/modules/taskSlice';
import type { AppDispatch } from '@/store';
import type { AgentMessage, AgentType } from '@/types/agent';
import { streamAgentRun } from '@/services/agentStreamService';
import { confirmAgentDrafts } from '@/apis/agent';
import './index.scss';

const { TextArea } = Input;

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
    '在这里发起任务拆解、进展摘要或周报生成。第一版重点支持结构化草案、流式过程和确认落库闭环。',
  send: '运行 Agent',
  confirm: '确认创建任务',
  confirmed: '已创建',
  creating: '创建中...',
  placeholder: '输入目标、补充说明或希望 Agent 帮你完成的任务',
  streaming: 'Agent 正在执行...',
  idleHint: '先选择一个 Agent 类型，再输入任务目标。',
  confirmSuccess: '任务草案已写入任务系统。',
  confirmFailed: '创建失败，请稍后重试。'
};

function createMessage(role: AgentMessage['role'], content: string, extra?: Partial<AgentMessage>): AgentMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    ...extra
  };
}

const AgentPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [agentType, setAgentType] = useState<AgentType>('task_planner');
  const [input, setInput] = useState(presets.task_planner);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const latestDraftMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'draft' && item.status !== 'confirmed'),
    [messages]
  );

  const appendAssistantChunk = (chunk: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.status === 'pending') {
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
      }
      return [...prev, createMessage('assistant', chunk, { status: 'pending' })];
    });
  };

  const finalizeAssistantMessage = () => {
    setMessages((prev) =>
      prev.map((item, index) =>
        index === prev.length - 1 && item.role === 'assistant' ? { ...item, status: 'ready' } : item
      )
    );
  };

  const handleRun = async () => {
    if (!input.trim() || isRunning) return;
    setIsRunning(true);
    setMessages((prev) => [...prev, createMessage('user', input)]);

    try {
      await streamAgentRun(agentType, input, {
        message: ({ chunk }) => appendAssistantChunk(chunk),
        tool_start: ({ message }) =>
          setMessages((prev) => [...prev, createMessage('tool', `开始执行：${message}`)]),
        tool_result: ({ message }) =>
          setMessages((prev) => [...prev, createMessage('tool', `执行结果：${message}`)]),
        draft: ({ drafts }) =>
          setMessages((prev) => [
            ...prev,
            createMessage('draft', '已生成任务草案，请确认后写入任务系统。', {
              drafts,
              status: 'ready'
            })
          ]),
        need_confirm: ({ message }) =>
          setMessages((prev) => [...prev, createMessage('system', message)]),
        error: ({ message }) =>
          setMessages((prev) => [...prev, createMessage('error', message)]),
        done: () => finalizeAssistantMessage()
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, createMessage('error', 'Agent 执行失败，请检查服务或重试。')]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirmDrafts = async () => {
    if (!latestDraftMessage?.drafts?.length || isConfirming) return;
    setIsConfirming(true);
    try {
      await confirmAgentDrafts(latestDraftMessage.drafts);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === latestDraftMessage.id ? { ...item, status: 'confirmed', content: text.confirmSuccess } : item
        )
      );
      dispatch(fetchTaskList());
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, createMessage('error', text.confirmFailed)]);
    } finally {
      setIsConfirming(false);
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

        <Card className="agent-panel output-panel">
          <div className="panel-title-row">
            <h3>执行记录</h3>
            <Tag color={isRunning ? 'processing' : 'default'}>{isRunning ? text.streaming : 'Ready'}</Tag>
          </div>

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
    </div>
  );
};

export default AgentPage;
