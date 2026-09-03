const { AGENT_TYPES, streamAgentRun, writeEvent } = require('../services/agentService');
const { createTaskForUser, getUserTasks } = require('../services/taskService');
const {
  createRun,
  updateRun,
  createRunEvent,
  listRuns,
  getRun,
  listRunEvents,
  removeRun
} = require('../services/agentRunLogService');

const MAX_AGENT_INPUT_LENGTH = 4000;
const MAX_DRAFTS_PER_CONFIRM = 6;
const AGENT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AGENT_RATE_LIMIT_MAX = 5;
const agentRateLimitBuckets = new Map();

function normalizeAgentInput(input) {
  return String(input || '').trim();
}

function normalizeAgentType(agentType) {
  return Object.values(AGENT_TYPES).includes(agentType)
    ? agentType
    : AGENT_TYPES.TASK_PLANNER;
}

function isValidDate(value) {
  const date = new Date(value);
  return Boolean(value) && !Number.isNaN(date.getTime());
}

function validateDrafts(drafts) {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    throw new Error('缺少任务草稿');
  }
  if (drafts.length > MAX_DRAFTS_PER_CONFIRM) {
    throw new Error(`单次最多确认 ${MAX_DRAFTS_PER_CONFIRM} 条任务草稿`);
  }

  return drafts.map((draft, index) => {
    const normalized = {
      name: String(draft.name || '').trim(),
      description: String(draft.description || '').trim(),
      created_at: draft.created_at,
      created_end: draft.created_end,
      status: draft.status ?? 0
    };

    if (!normalized.name || normalized.name.length > 120) {
      throw new Error(`第 ${index + 1} 条任务草稿名称不合法`);
    }
    if (!normalized.description || normalized.description.length > 2000) {
      throw new Error(`第 ${index + 1} 条任务草稿描述不合法`);
    }
    if (!isValidDate(normalized.created_at) || !isValidDate(normalized.created_end)) {
      throw new Error(`第 ${index + 1} 条任务草稿日期不合法`);
    }
    if (new Date(normalized.created_end) <= new Date(normalized.created_at)) {
      throw new Error(`第 ${index + 1} 条任务草稿结束时间必须晚于开始时间`);
    }

    return normalized;
  });
}

function durationSince(startedAt) {
  const start = new Date(startedAt).getTime();
  return Number.isFinite(start) ? Date.now() - start : null;
}

function checkAgentRateLimit(userId) {
  const now = Date.now();
  const bucket = agentRateLimitBuckets.get(userId) || [];
  const recent = bucket.filter((timestamp) => now - timestamp < AGENT_RATE_LIMIT_WINDOW_MS);

  if (recent.length >= AGENT_RATE_LIMIT_MAX) {
    agentRateLimitBuckets.set(userId, recent);
    return false;
  }

  recent.push(now);
  agentRateLimitBuckets.set(userId, recent);
  return true;
}

exports.streamAgent = async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  let run = null;
  let responseFinished = false;
  const abortController = new AbortController();

  res.on('close', () => {
    if (!responseFinished) {
      abortController.abort();
    }
  });

  try {
    const input = normalizeAgentInput(req.body.input);
    const agentType = normalizeAgentType(req.body.agentType);

    if (!input) {
      writeEvent(res, 'error', { message: 'Agent 输入不能为空' });
      responseFinished = true;
      return res.end();
    }
    if (input.length > MAX_AGENT_INPUT_LENGTH) {
      writeEvent(res, 'error', { message: `Agent 输入不能超过 ${MAX_AGENT_INPUT_LENGTH} 个字符` });
      responseFinished = true;
      return res.end();
    }
    if (!checkAgentRateLimit(req.user.id)) {
      writeEvent(res, 'error', { message: 'Agent 请求过于频繁，请稍后再试' });
      responseFinished = true;
      return res.end();
    }

    run = await createRun({
      userId: req.user.id,
      agentType,
      input
    });

    const startedAtMs = Date.now();
    res.locals.recordAgentEvent = (eventType, payload) => {
      createRunEvent({
        runId: run.id,
        userId: req.user.id,
        eventType,
        payload
      }).catch((error) => {
        console.warn('record agent event failed:', error.message);
      });
    };

    writeEvent(res, 'run_started', {
      runId: run.id,
      startedAt: run.startedAt
    });

    const result = await streamAgentRun({
      userId: req.user.id,
      agentType,
      input,
      res,
      abortSignal: abortController.signal
    });

    if (abortController.signal.aborted) {
      throw Object.assign(new Error('Agent stream aborted'), { name: 'AbortError' });
    }

    await updateRun(run.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      knowledgeHits: result.knowledgeHits,
      draftCount: result.draftCount,
      knowledgeHitCount: result.metrics?.knowledgeHitCount || result.knowledgeHits.length,
      toolCallCount: result.metrics?.toolCallCount || 0,
      fallbackCount: result.metrics?.fallbackCount || 0,
      durationMs: Date.now() - startedAtMs,
      summary: result.assistantText.slice(0, 800)
    }, req.user.id);

    writeEvent(res, 'done', {
      ok: true,
      runId: run.id,
      draftCount: result.draftCount
    });
    responseFinished = true;
    res.end();
  } catch (error) {
    if (error.name === 'AbortError' || abortController.signal.aborted) {
      console.warn('agent stream cancelled by client:', run?.id);
      if (run) {
        await updateRun(run.id, {
          status: 'cancelled',
          completedAt: new Date().toISOString(),
          durationMs: durationSince(run.startedAt),
          summary: 'Agent execution cancelled by client'
        }, req.user.id);
        res.locals.recordAgentEvent?.('cancelled', { runId: run.id });
      }
      responseFinished = true;
      if (!res.destroyed && !res.writableEnded) {
        res.end();
      }
      return;
    }

    console.error('agent stream failed:', error);
    if (run) {
      await updateRun(run.id, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        durationMs: durationSince(run.startedAt),
        summary: error.message || 'Agent execution failed'
      }, req.user.id);
    }
    writeEvent(res, 'error', {
      message: error.message || 'Agent 执行失败',
      runId: run?.id
    });
    responseFinished = true;
    res.end();
  }
};

exports.confirmDrafts = async (req, res) => {
  const drafts = Array.isArray(req.body.drafts) ? req.body.drafts : [];
  const runId = req.body.runId;
  const userId = req.user.id;

  try {
    const normalizedDrafts = validateDrafts(drafts);

    if (runId) {
      const run = await getRun(runId, userId);
      if (!run) {
        return res.cc('运行记录不存在或无权限确认');
      }
      if (run.status === 'confirmed') {
        return res.cc('该 Agent 草稿已确认，请勿重复创建');
      }
    }

    const existingTasks = await getUserTasks(userId);
    const baseIndex = existingTasks.length + 1;
    const createdTaskIds = [];

    for (const [offset, draft] of normalizedDrafts.entries()) {
      const taskId = await createTaskForUser(userId, {
        name: draft.name,
        description: draft.description,
        created_at: draft.created_at,
        created_end: draft.created_end,
        status: draft.status,
        index: baseIndex + offset
      });
      createdTaskIds.push(taskId);
    }

    if (runId) {
      await updateRun(runId, {
        status: 'confirmed',
        confirmedTaskIds: createdTaskIds
      }, userId);
      await createRunEvent({
        runId,
        userId,
        eventType: 'confirmed',
        payload: { createdTaskIds }
      });
    }

    res.send({
      status: 0,
      message: '任务草稿已创建',
      data: {
        createdTaskIds
      }
    });
  } catch (error) {
    console.error('confirm drafts failed:', error);
    res.cc(error);
  }
};

exports.getRuns = async (req, res) => {
  try {
    const data = await listRuns(req.user.id);
    res.send({
      status: 0,
      message: '获取 Agent 运行记录成功',
      data
    });
  } catch (error) {
    res.cc(error);
  }
};

exports.getRunDetail = async (req, res) => {
  try {
    const runId = req.params.id;
    const run = await getRun(runId, req.user.id);

    if (!run) {
      return res.cc('运行记录不存在或无权限查看');
    }

    const events = await listRunEvents(runId, req.user.id);

    res.send({
      status: 0,
      message: '获取运行详情成功',
      data: {
        ...run,
        events
      }
    });
  } catch (error) {
    res.cc(error);
  }
};

exports.deleteRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const ok = await removeRun(runId, req.user.id);

    if (!ok) {
      return res.cc('运行记录不存在或无权限删除');
    }

    res.send({
      status: 0,
      message: '运行记录删除成功'
    });
  } catch (error) {
    res.cc(error);
  }
};
