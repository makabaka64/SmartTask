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

const MODEL_CALL_TIMEOUT_MS = 60 * 1000;
const TOOL_CALL_TIMEOUT_MS = 15 * 1000;
const TOOL_RETRY_LIMIT = 1;

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
      name: "get_task_stats",
      description:
        "Read aggregate task statistics including totals, completed, pending, in-progress, overdue, upcoming, and priority distribution.",
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
  if (res.destroyed || res.writableEnded) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (event !== "message" && typeof res.locals?.recordAgentEvent === "function") {
    res.locals.recordAgentEvent(event, data);
  }
}

function throwIfAborted(abortSignal) {
  if (!abortSignal?.aborted) return;
  const error = new Error("Agent stream aborted");
  error.name = "AbortError";
  throw error;
}

function createTimeoutSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error(`Operation timed out after ${timeoutMs}ms`);
    error.name = "TimeoutError";
    controller.abort(error);
  }, timeoutMs);

  const abortFromParent = () => {
    controller.abort(parentSignal.reason);
  };
  if (parentSignal?.aborted) {
    abortFromParent();
  } else if (parentSignal) {
    parentSignal.addEventListener("abort", abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      parentSignal?.removeEventListener?.("abort", abortFromParent);
    },
  };
}

async function withTimeout(promiseFactory, timeoutMs, label, abortSignal) {
  throwIfAborted(abortSignal);
  const timeout = createTimeoutSignal(abortSignal, timeoutMs);
  try {
    return await Promise.race([
      promiseFactory(timeout.signal),
      new Promise((_, reject) => {
        timeout.signal.addEventListener(
          "abort",
          () => {
            const error = new Error(`${label} timed out`);
            error.name = abortSignal?.aborted ? "AbortError" : "TimeoutError";
            reject(error);
          },
          { once: true },
        );
      }),
    ]);
  } catch (error) {
    if (timeout.signal.aborted && !abortSignal?.aborted) {
      const timeoutError = new Error(`${label} timed out`);
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }
    throw error;
  } finally {
    timeout.cleanup();
  }
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeToolLimit(value, fallback = 4, min = 1, max = 6) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function classifyToolError(error) {
  const code = error?.code || error?.cause?.code || error?.name || "TOOL_ERROR";
  const message = error?.message || "Tool execution failed";
  const retryableCodes = new Set([
    "AbortError",
    "TimeoutError",
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ENOTFOUND",
  ]);

  return {
    code: retryableCodes.has(code) ? code : "TOOL_ERROR",
    message,
    retryable: retryableCodes.has(code),
  };
}

function buildToolErrorResult(toolName, error, attempts) {
  const classified = classifyToolError(error);
  return {
    ok: false,
    error: {
      tool: toolName,
      code: classified.code,
      message: classified.message,
      retryable: classified.retryable,
      attempts,
      suggestedAction: classified.retryable
        ? "retry once with simpler arguments, or continue with available context if retry fails"
        : "continue with available context and tell the user what was unavailable",
    },
  };
}

function normalizeDraftText(value, fallback = "") {
  return String(value || fallback).trim().slice(0, 500);
}

function normalizePriority(value) {
  return ["high", "medium", "low"].includes(value) ? value : "medium";
}

function normalizeDate(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeTaskDrafts(rawTasks) {
  const base = new Date();
  return (Array.isArray(rawTasks) ? rawTasks : [])
    .slice(0, 6)
    .map((task, index) => {
      const start = new Date(base);
      start.setDate(start.getDate() + Number(task.startOffsetDays || index));
      const end = new Date(start);
      end.setDate(end.getDate() + Math.max(1, Number(task.durationDays || 2)));
      const normalizedStart = normalizeDate(task.created_at, start);
      const normalizedEnd = normalizeDate(task.created_end, end);

      return {
        name: normalizeDraftText(task.name, `任务 ${index + 1}`),
        description: normalizeDraftText(task.description, "请补充任务说明"),
        priority: normalizePriority(task.priority),
        risk: normalizeDraftText(task.risk),
        created_at: normalizedStart.toISOString(),
        created_end: normalizedEnd > normalizedStart
          ? normalizedEnd.toISOString()
          : end.toISOString(),
        status: 0,
      };
    })
    .filter((task) => task.name && task.description);
}

async function streamTextResponse({ messages, systemPrompt, userPrompt, res, abortSignal }) {
  throwIfAborted(abortSignal);
  const requestMessages =
    messages ||
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  const stream = await withTimeout(
    (signal) =>
      openai.chat.completions.create(
        {
          model: "deepseek-v4-flash",
          messages: requestMessages,
          stream: true,
        },
        { signal },
      ),
    MODEL_CALL_TIMEOUT_MS,
    "stream model response",
    abortSignal,
  );

  let fullText = "";
  for await (const chunk of stream) {
    throwIfAborted(abortSignal);
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) continue;
    fullText += delta;
    writeEvent(res, "message", { chunk: delta });
  }
  return fullText;
}

async function generateTaskDrafts({ input, tasks, abortSignal }) {
  throwIfAborted(abortSignal);
  const response = await withTimeout(
    (signal) =>
      openai.chat.completions.create(
        {
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
        },
        { signal },
      ),
    MODEL_CALL_TIMEOUT_MS,
    "generate task drafts",
    abortSignal,
  );

  const content = response.choices?.[0]?.message?.content || '{"tasks":[]}';
  const parsed = safeParseJson(content, { tasks: [] });
  return normalizeTaskDrafts(parsed.tasks);
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
  abortSignal,
}) {
  throwIfAborted(abortSignal);
  const args = safeParseJson(toolCall.function.arguments, {});

  switch (toolCall.function.name) {
    case "get_user_tasks": {
      writeEvent(res, "tool_start", {
        tool: "get_user_tasks",
        message: "模型正在读取当前用户任务上下文",
      });
      throwIfAborted(abortSignal);
      const tasks = await withTimeout(
        () => getUserTasks(userId),
        TOOL_CALL_TIMEOUT_MS,
        "get_user_tasks",
        abortSignal,
      );
      throwIfAborted(abortSignal);
      const stats = summarizeTasks(tasks);
      state.tasks = tasks;
      state.stats = stats;
      writeEvent(res, "tool_result", {
        tool: "get_user_tasks",
        message: `已读取 ${stats.total} 条任务，其中 ${stats.completed} 条已完成`,
      });
      return {
        ok: true,
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
    case "get_task_stats": {
      writeEvent(res, "tool_start", {
        tool: "get_task_stats",
        message: "模型正在读取任务统计指标",
      });
      throwIfAborted(abortSignal);
      const tasks = state.tasks.length
        ? state.tasks
        : await withTimeout(
            () => getUserTasks(userId),
            TOOL_CALL_TIMEOUT_MS,
            "get_task_stats",
            abortSignal,
          );
      throwIfAborted(abortSignal);
      const stats = summarizeTasks(tasks);
      state.tasks = tasks;
      state.stats = stats;
      writeEvent(res, "tool_result", {
        tool: "get_task_stats",
        message: `任务统计：共 ${stats.total} 条，已完成 ${stats.completed} 条，进行中 ${stats.inProgress} 条，逾期 ${stats.overdue} 条`,
      });
      return {
        ok: true,
        stats,
      };
    }
    case "search_knowledge": {
      const query = typeof args.query === "string" && args.query.trim()
        ? args.query.trim()
        : input;
      const limit = normalizeToolLimit(args.limit);
      writeEvent(res, "tool_start", {
        tool: "search_knowledge",
        message: `模型正在检索相关知识：${query}`,
      });
      throwIfAborted(abortSignal);
      const knowledgeResults = await withTimeout(
        () => searchKnowledge(userId, query, limit),
        TOOL_CALL_TIMEOUT_MS,
        "search_knowledge",
        abortSignal,
      );
      throwIfAborted(abortSignal);
      state.knowledgeHits = knowledgeResults;
      state.knowledgeHitCount += knowledgeResults.length;
      emitKnowledgeEvents(
        res,
        knowledgeResults,
        "未命中知识片段，模型将使用通用任务拆解策略",
      );
      return {
        ok: true,
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
        ok: false,
        error: {
          tool: toolCall.function.name,
          code: "UNSUPPORTED_TOOL",
          message: `Unsupported tool: ${toolCall.function.name}`,
          retryable: false,
          suggestedAction: "continue without this tool",
        },
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
  abortSignal,
}) {
  throwIfAborted(abortSignal);
  const toolName = toolCall.function.name;

  if (toolName === "get_user_tasks" || toolName === "get_task_stats" || toolName === "search_knowledge") {
    let lastError = null;
    let attemptsMade = 0;
    for (let attempt = 0; attempt <= TOOL_RETRY_LIMIT; attempt += 1) {
      attemptsMade = attempt + 1;
      try {
        return await executeTaskPlannerTool({
          toolCall,
          userId,
          input,
          res,
          state,
          abortSignal,
        });
      } catch (error) {
        lastError = error;
        throwIfAborted(abortSignal);
        const classified = classifyToolError(error);
        const shouldRetry = classified.retryable && attempt < TOOL_RETRY_LIMIT;
        writeEvent(res, "tool_result", {
          tool: toolName,
          message: shouldRetry
            ? `${toolName} failed: ${classified.message}. Retrying once.`
            : `${toolName} failed: ${classified.message}`,
          error: true,
          retryable: shouldRetry,
        });
        if (!shouldRetry) break;
        await sleep(300 * (attempt + 1));
      }
    }

    return buildToolErrorResult(toolName, lastError, attemptsMade);
  }

  return {
    ok: false,
    error: {
      tool: toolName,
      code: "UNSUPPORTED_TOOL",
      message: `Unsupported tool: ${toolName}`,
      retryable: false,
      suggestedAction: "continue without this tool",
    },
  };
}

async function resolveAgentToolCalls({
  userId,
  input,
  res,
  systemPrompt,
  userPrompt,
  maxRounds = 4,
  abortSignal,
}) {
  const state = {
    tasks: [],
    stats: null,
    knowledgeHits: [],
    knowledgeHitCount: 0,
  };
  let toolCallCount = 0;
  let fallbackCount = 0;

  const messages = [
    {
      role: "system",
      content: [
        systemPrompt,
        "Tool protocol: tool results may return {ok:false,error:{code,message,retryable,attempts,suggestedAction}}.",
        "If retryable is true, retry the failed tool at most once with simpler arguments.",
        "If retry still fails or retryable is false, continue with available context and clearly mention unavailable context when useful.",
      ].join("\n"),
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];

  for (let round = 0; round < maxRounds; round += 1) {
    throwIfAborted(abortSignal);
    const completion = await withTimeout(
      (signal) =>
        openai.chat.completions.create(
          {
            model: "deepseek-v4-flash",
            messages,
            tools: TASK_PLANNER_TOOLS,
            tool_choice: "auto",
          },
          { signal },
        ),
      MODEL_CALL_TIMEOUT_MS,
      "tool calling model response",
      abortSignal,
    );

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
        abortSignal,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (toolCallCount === 0) {
    fallbackCount += 1;
    toolCallCount += 3;
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
      abortSignal,
    });
    messages.push({
      role: "tool",
      tool_call_id: fallbackTaskCall.id,
      content: JSON.stringify(taskResult),
    });

    const fallbackStatsCall = createToolCall("get_task_stats");
    const statsResult = await executeAgentTool({
      toolCall: fallbackStatsCall,
      userId,
      input,
      res,
      state,
      abortSignal,
    });
    messages.push({
      role: "tool",
      tool_call_id: fallbackStatsCall.id,
      content: JSON.stringify(statsResult),
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
      abortSignal,
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
    metrics: {
      toolCallCount,
      fallbackCount,
      knowledgeHitCount: state.knowledgeHitCount,
    },
  };
}

async function runTaskPlanner({ userId, input, res, abortSignal }) {
  const { messages, tasks, knowledgeHits, metrics } =
    await resolveAgentToolCalls({
      userId,
      input,
      res,
      systemPrompt:
        "You are an execution-oriented task planning agent. Before answering, always call get_user_tasks. If existing workload, overdue tasks, or priority distribution may affect planning, call get_task_stats. If the goal may benefit from personal notes, project docs, or review constraints, call search_knowledge. After enough context is collected, stop calling tools.",
      userPrompt: `用户目标：${input}\n请先通过工具收集足够上下文，再给出简洁中文说明。`,
      abortSignal,
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
    abortSignal,
  });

  const drafts = await generateTaskDrafts({
    input: `${input}\n\n参考知识：\n${knowledgeContext}`,
    tasks,
    abortSignal,
  });
  throwIfAborted(abortSignal);
  writeEvent(res, "draft", { drafts });
  writeEvent(res, "need_confirm", {
    message: "已生成任务草案，确认后将写入任务系统。",
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: drafts.length,
    metrics,
  };
}

async function runProgressSummary({ userId, input, res, abortSignal }) {
  const goal = input || "任务进展总结";
  const { messages, knowledgeHits, metrics } = await resolveAgentToolCalls({
    userId,
    input: goal,
    res,
    systemPrompt:
      "You are a project progress assistant. Always call get_user_tasks and get_task_stats first to understand task details and aggregate progress. If relevant project context, norms, or reporting constraints may help, call search_knowledge. Stop calling tools after you have enough context to summarize progress.",
    userPrompt: `补充说明：${goal}\n请先通过工具收集任务与知识上下文，再输出中文进展总结。`,
    abortSignal,
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
    abortSignal,
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: 0,
    metrics,
  };
}

async function runWeeklyReport({ userId, input, res, abortSignal }) {
  const goal = input || "周报输出规范";
  const { messages, knowledgeHits, metrics } = await resolveAgentToolCalls({
    userId,
    input: goal,
    res,
    systemPrompt:
      "You are a weekly report assistant. Always call get_user_tasks and get_task_stats first. If reporting templates, project context, or delivery norms may help, call search_knowledge. Stop calling tools after you have enough context to prepare the weekly report.",
    userPrompt: `额外要求：${goal}\n请先通过工具收集周报所需上下文，再输出中文周报。`,
    abortSignal,
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
    abortSignal,
  });

  return {
    assistantText,
    knowledgeHits,
    draftCount: 0,
    metrics,
  };
}

async function streamAgentRun({ userId, agentType, input, res, abortSignal }) {
  if (!input) {
    throw new Error("input is required");
  }
  throwIfAborted(abortSignal);

  switch (agentType) {
    case AGENT_TYPES.PROGRESS_SUMMARY:
      return runProgressSummary({ userId, input, res, abortSignal });
    case AGENT_TYPES.WEEKLY_REPORT:
      return runWeeklyReport({ userId, input, res, abortSignal });
    case AGENT_TYPES.TASK_PLANNER:
    default:
      return runTaskPlanner({ userId, input, res, abortSignal });
  }
}

module.exports = {
  AGENT_TYPES,
  writeEvent,
  streamAgentRun,
};
