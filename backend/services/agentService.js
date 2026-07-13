const { openai } = require('../openai');
const { getUserTasks, summarizeTasks } = require('./taskService');

const AGENT_TYPES = {
  TASK_PLANNER: 'task_planner',
  PROGRESS_SUMMARY: 'progress_summary',
  WEEKLY_REPORT: 'weekly_report'
};

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildTaskContext(tasks) {
  return tasks
    .slice(0, 20)
    .map((task) => {
      const status = task.status === 1 ? 'done' : 'pending';
      return `- ${task.name} | status: ${status} | start: ${task.created_at} | end: ${task.created_end}`;
    })
    .join('\n');
}

async function streamTextResponse({ systemPrompt, userPrompt, res }) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    stream: true
  });

  let fullText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;
    writeEvent(res, 'message', { chunk: delta });
  }
  return fullText;
}

async function generateTaskDrafts({ input, tasks }) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a task planning assistant. Return JSON only. Create 3 to 6 actionable tasks. Each task must include name, description, priority(high|medium|low), startOffsetDays, durationDays, and risk.'
      },
      {
        role: 'user',
        content: `User goal:\n${input}\n\nExisting tasks:\n${buildTaskContext(tasks) || 'No existing tasks.'}\n\nReturn valid JSON with shape {"tasks":[...]}. Avoid markdown.`
      }
    ],
    response_format: { type: 'json_object' }
  });

  const content = response.choices?.[0]?.message?.content || '{"tasks":[]}';
  const parsed = JSON.parse(content);
  const base = new Date();
  return (parsed.tasks || []).map((task, index) => {
    const start = new Date(base);
    start.setDate(start.getDate() + Number(task.startOffsetDays || index));
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, Number(task.durationDays || 2)));
    return {
      name: task.name,
      description: task.description,
      priority: task.priority || 'medium',
      risk: task.risk || '',
      created_at: start.toISOString(),
      created_end: end.toISOString(),
      status: 0
    };
  });
}

async function runTaskPlanner({ userId, input, res }) {
  writeEvent(res, 'tool_start', {
    tool: 'get_user_tasks',
    message: '正在读取当前用户任务上下文'
  });
  const tasks = await getUserTasks(userId);
  const stats = summarizeTasks(tasks);
  writeEvent(res, 'tool_result', {
    tool: 'get_user_tasks',
    message: `已读取 ${stats.total} 条任务，其中 ${stats.completed} 条已完成`
  });

  await streamTextResponse({
    systemPrompt:
      'You are an execution-oriented task planning assistant. Explain briefly in Chinese how you are breaking the goal into actionable tasks. Keep it concise and practical.',
    userPrompt: `用户目标：${input}\n现有任务概况：${JSON.stringify(stats)}\n现有任务列表：\n${buildTaskContext(tasks) || '暂无任务'}`,
    res
  });

  const drafts = await generateTaskDrafts({ input, tasks });
  writeEvent(res, 'draft', {
    drafts
  });
  writeEvent(res, 'need_confirm', {
    message: '已生成任务草案，确认后将写入任务系统。'
  });
}

async function runProgressSummary({ userId, input, res }) {
  writeEvent(res, 'tool_start', {
    tool: 'get_user_tasks',
    message: '正在汇总任务进展'
  });
  const tasks = await getUserTasks(userId);
  const stats = summarizeTasks(tasks);
  writeEvent(res, 'tool_result', {
    tool: 'get_user_tasks',
    message: `已汇总 ${stats.total} 条任务，开始生成进展摘要`
  });

  await streamTextResponse({
    systemPrompt:
      'You are a project progress assistant. Reply in Chinese with a concise progress summary, current risks, blockers, and next actions.',
    userPrompt: `补充说明：${input || '无'}\n任务统计：${JSON.stringify(stats)}\n任务列表：\n${buildTaskContext(tasks) || '暂无任务'}`,
    res
  });
}

async function runWeeklyReport({ userId, input, res }) {
  writeEvent(res, 'tool_start', {
    tool: 'get_user_tasks',
    message: '正在准备周报上下文'
  });
  const tasks = await getUserTasks(userId);
  const stats = summarizeTasks(tasks);
  writeEvent(res, 'tool_result', {
    tool: 'get_user_tasks',
    message: `已读取 ${stats.total} 条任务，开始生成周报`
  });

  await streamTextResponse({
    systemPrompt:
      'You are a weekly report assistant. Reply in Chinese and organize the output into four sections: completed, in progress, risks, next week plan.',
    userPrompt: `额外要求：${input || '无'}\n任务统计：${JSON.stringify(stats)}\n任务列表：\n${buildTaskContext(tasks) || '暂无任务'}`,
    res
  });
}

async function streamAgentRun({ userId, agentType, input, res }) {
  if (!input) {
    throw new Error('input is required');
  }

  switch (agentType) {
    case AGENT_TYPES.PROGRESS_SUMMARY:
      await runProgressSummary({ userId, input, res });
      break;
    case AGENT_TYPES.WEEKLY_REPORT:
      await runWeeklyReport({ userId, input, res });
      break;
    case AGENT_TYPES.TASK_PLANNER:
    default:
      await runTaskPlanner({ userId, input, res });
      break;
  }

  writeEvent(res, 'done', { ok: true });
}

module.exports = {
  AGENT_TYPES,
  writeEvent,
  streamAgentRun
};
