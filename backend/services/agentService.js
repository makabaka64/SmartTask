const { openai } = require("../openai");
const { getUserTasks, summarizeTasks } = require("./taskService");
const {
  searchKnowledge,
  formatKnowledgeContext,
} = require("./knowledgeBaseService");

const AGENT_TYPES = {
  TASK_PLANNER: "task_planner",
  PROGRESS_SUMMARY: "progress_summary",
  WEEKLY_REPORT: "weekly_report",
};

const TASK_PLANNER_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_user_tasks",
      description:
        "Read the user's current task list and summary stats before planning new tasks.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "Search the user's personal knowledge base for planning constraints, project docs, or review notes relevant to the current goal.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query used to retrieve related knowledge.",
          },
          limit: {
            type: "integer",
            description: "Maximum number of knowledge chunks to return.",
            minimum: 1,
            maximum: 6,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
];

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function buildTaskContext(tasks) {
  return tasks
    .slice(0, 20)
    .map((task) => {
      const status = task.status === 1 ? "done" : "pending";
      return `- ${task.name} | status: ${status} | start: ${task.created_at} | end: ${task.created_end}`;
    })
    .join("\n");
}

function safeParseJson(raw, fallback = {}) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

async function streamTextResponse({ messages, systemPrompt, userPrompt, res }) {
  const requestMessages =
    messages ||
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  const stream = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: requestMessages,
    stream: true,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;
    writeEvent(res, "message", { chunk: delta });
  }
  return fullText;
}

async function generateTaskDrafts({ input, tasks }) {
  const response = await openai.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content:
          "You are a task planning assistant. Return JSON only. Create 3 to 6 actionable tasks. Each task must include name, description, priority(high|medium|low), startOffsetDays, durationDays, and risk.",
      },
      {
        role: "user",
        content: `User goal:\n${input}\n\nExisting tasks:\n${buildTaskContext(tasks) || "No existing tasks."}\n\nReturn valid JSON with shape {"tasks":[...]}. Avoid markdown.`,
      },
    ],
    response_format: { type: "json_object" },
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
      priority: task.priority || "medium",
      risk: task.risk || "",
      created_at: start.toISOString(),
      created_end: end.toISOString(),
      status: 0,
    };
  });
}

function emitKnowledgeEvents(res, knowledgeResults, emptyMessage) {
  writeEvent(res, "tool_result", {
    tool: "search_knowledge",
    message: knowledgeResults.length
      ? `命中 ${knowledgeResults.length} 条知识片段：${knowledgeResults.map((item) => item.source).join("、")}`
      : emptyMessage,
  });

  if (knowledgeResults.length) {
    writeEvent(res, "knowledge_hits", {
      hits: knowledgeResults.map((item) => ({
        source: item.source,
        content: item.content,
        score: item.score,
      })),
    });
  }
}

async function executeTaskPlannerTool({
  toolCall,
  userId,
  input,
  res,
  state,
}) {
  const args = safeParseJson(toolCall.function.arguments, {});

  switch (toolCall.function.name) {
    case "get_user_tasks": {
      writeEvent(res, "tool_start", {
        tool: "get_user_tasks",
        message: "模型正在读取当前用户任务上下文",
      });
      const tasks = await getUserTasks(userId);
      const stats = summarizeTasks(tasks);
      state.tasks = tasks;
      state.stats = stats;
      writeEvent(res, "tool_result", {
        tool: "get_user_tasks",
        message: `已读取 ${stats.total} 条任务，其中 ${stats.completed} 条已完成`,
      });
      return {
        stats,
        taskCount: tasks.length,
        tasks: tasks.slice(0, 20).map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status === 1 ? "done" : "pending",
          created_at: task.created_at,
          created_end: task.created_end,
        })),
      };
    }
    case "search_knowledge": {
      const query = typeof args.query === "string" && args.query.trim()
        ? args.query.trim()
        : input;
      const limit = Number.isInteger(args.limit) ? args.limit : 4;
      writeEvent(res, "tool_start", {
        tool: "search_knowledge",
        message: `模型正在检索相关知识：${query}`,
      });
      const knowledgeResults = await searchKnowledge(userId, query, limit);
      state.knowledgeHits = knowledgeResults;
      emitKnowledgeEvents(
        res,
        knowledgeResults,
        "未命中知识片段，模型将使用通用任务拆解策略",
      );
      return {
        query,
        hits: knowledgeResults.map((item) => ({
          source: item.source,
          category: item.category,
          content: item.content,
          score: item.score,
        })),
      };
    }
    default:
      return {
        error: `Unsupported tool: ${toolCall.function.name}`,
      };
  }
}

function createToolCall(name, args = {}, idSuffix = "fallback") {
  return {
    id: `${name}_${idSuffix}`,
    type: "function",
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  };
}

async function executeAgentTool({
  toolCall,
  userId,
  input,
  res,
  state,
}) {
  const toolName = toolCall.function.name;

  if (toolName === "get_user_tasks" || toolName === "search_knowledge") {
    return executeTaskPlannerTool({
      toolCall,
      userId,
      input,
      res,
      state,
    });
  }

  return {
    error: `Unsupported tool: ${toolName}`,
  };
}

async function resolveAgentToolCalls({
  userId,
  input,
  res,
  systemPrompt,
  userPrompt,
  maxRounds = 4,
}) {
  const state = {
    tasks: [],
    stats: null,
    knowledgeHits: [],
  };
  let toolCallCount = 0;

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  for (let round = 0; round < maxRounds; round += 1) {
    const completion = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      tools: TASK_PLANNER_TOOLS,
      tool_choice: "auto",
    });

    const message = completion.choices?.[0]?.message;
    if (!message) break;

    messages.push(message);

    if (!message.tool_calls?.length) {
      break;
    }

    for (const toolCall of message.tool_calls) {
      toolCallCount += 1;
      const result = await executeAgentTool({
        toolCall,
        userId,
        input,
        res,
        state,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (toolCallCount === 0) {
    writeEvent(res, "tool_result", {
      tool: "agent_fallback",
      message: "模型未主动发起工具调用，已切换为后端兜底上下文收集。",
    });

    const fallbackTaskCall = createToolCall("get_user_tasks");
    const taskResult = await executeAgentTool({
      toolCall: fallbackTaskCall,
      userId,
      input,
      res,
      state,
    });
    messages.push({
      role: "tool",
      tool_call_id: fallbackTaskCall.id,
      content: JSON.stringify(taskResult),
    });

    const fallbackKnowledgeCall = createToolCall("search_knowledge", {
      query: input,
      limit: 4,
    });
    const knowledgeResult = await executeAgentTool({
      toolCall: fallbackKnowledgeCall,
      userId,
      input,
      res,
      state,
    });
    messages.push({
      role: "tool",
      tool_call_id: fallbackKnowledgeCall.id,
      content: JSON.stringify(knowledgeResult),
    });
  }

  return {
    messages,
    tasks: state.tasks,
    stats: state.stats || summarizeTasks(state.tasks),
    knowledgeHits: state.knowledgeHits,
  };
}

async function runTaskPlanner({ userId, input, res }) {
  const { messages, tasks, knowledgeHits } =
    await resolveAgentToolCalls({
      userId,
      input,
      res,
      systemPrompt:
        "You are an execution-oriented task planning agent. Before answering, always call get_user_tasks. If the goal may benefit from personal notes, project docs, or review constraints, call search_knowledge. After enough context is collected, stop calling tools.",
      userPrompt: `用户目标：${input}\n请先通过工具收集足够上下文，再给出简洁中文说明。`,
    });
  const knowledgeContext = formatKnowledgeContext(knowledgeHits);

  const assistantText = await streamTextResponse({
    messages: [
      ...messages,
      {
        role: "system",
        content:
          "Now provide a concise Chinese planning explanation based on the collected tool results. Focus on how the goal will be split into actionable tasks. Do not call tools again.",
      },
    ],
    res,
  });

  const drafts = await generateTaskDrafts({
    input: `${input}\n\n参考知识：\n${knowledgeContext}`,
    tasks,
  });
  writeEvent(res, "draft", { drafts });
  writeEvent(res, "need_confirm", {
    message: "已生成任务草案，确认后将写入任务系统。",
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: drafts.length,
  };
}

async function runProgressSummary({ userId, input, res }) {
  const goal = input || "任务进展总结";
  const { messages, knowledgeHits } = await resolveAgentToolCalls({
    userId,
    input: goal,
    res,
    systemPrompt:
      "You are a project progress assistant. Always call get_user_tasks first to understand the current workload. If relevant project context, norms, or reporting constraints may help, call search_knowledge. Stop calling tools after you have enough context to summarize progress.",
    userPrompt: `补充说明：${goal}\n请先通过工具收集任务与知识上下文，再输出中文进展总结。`,
  });

  const assistantText = await streamTextResponse({
    messages: [
      ...messages,
      {
        role: "system",
        content:
          "Now provide a concise Chinese progress summary based on the collected tool results. Include current progress, risks or blockers, and next actions. Do not call tools again.",
      },
    ],
    res,
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: 0,
  };
}

async function runWeeklyReport({ userId, input, res }) {
  const goal = input || "周报输出规范";
  const { messages, knowledgeHits } = await resolveAgentToolCalls({
    userId,
    input: goal,
    res,
    systemPrompt:
      "You are a weekly report assistant. Always call get_user_tasks first. If reporting templates, project context, or delivery norms may help, call search_knowledge. Stop calling tools after you have enough context to prepare the weekly report.",
    userPrompt: `额外要求：${goal}\n请先通过工具收集周报所需上下文，再输出中文周报。`,
  });

  const assistantText = await streamTextResponse({
    messages: [
      ...messages,
      {
        role: "system",
        content:
          "Now provide a Chinese weekly report based on the collected tool results. Organize the output into four sections: completed, in progress, risks, next week plan. Do not call tools again.",
      },
    ],
    res,
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: 0,
  };
}

async function streamAgentRun({ userId, agentType, input, res }) {
  if (!input) {
    throw new Error("input is required");
  }

  switch (agentType) {
    case AGENT_TYPES.PROGRESS_SUMMARY:
      return runProgressSummary({ userId, input, res });
    case AGENT_TYPES.WEEKLY_REPORT:
      return runWeeklyReport({ userId, input, res });
    case AGENT_TYPES.TASK_PLANNER:
    default:
      return runTaskPlanner({ userId, input, res });
  }
}

module.exports = {
  AGENT_TYPES,
  writeEvent,
  streamAgentRun,
};
