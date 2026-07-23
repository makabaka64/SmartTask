const { streamAgentRun, writeEvent } = require('../services/agentService');
const { createTaskForUser, getUserTasks } = require('../services/taskService');
const {
  createRun,
  updateRun,
  listRuns,
  getRun,
  removeRun
} = require('../services/agentRunLogService');

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
    run = await createRun({
      userId: req.user.id,
      agentType: req.body.agentType,
      input: req.body.input
    });

    writeEvent(res, 'run_started', {
      runId: run.id,
      startedAt: run.startedAt
    });

    const result = await streamAgentRun({
      userId: req.user.id,
      agentType: req.body.agentType,
      input: req.body.input,
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
          summary: 'Agent execution cancelled by client'
        }, req.user.id);
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

  if (!drafts.length) {
    return res.cc('缺少任务草案');
  }

  try {
    const existingTasks = await getUserTasks(userId);
    const baseIndex = existingTasks.length + 1;
    const createdTaskIds = [];

    for (const [offset, draft] of drafts.entries()) {
      const taskId = await createTaskForUser(userId, {
        name: draft.name,
        description: draft.description,
        created_at: draft.created_at,
        created_end: draft.created_end,
        status: draft.status ?? 0,
        index: baseIndex + offset
      });
      createdTaskIds.push(taskId);
    }

    if (runId) {
      await updateRun(runId, {
        status: 'confirmed',
        confirmedTaskIds: createdTaskIds
      }, userId);
    }

    res.send({
      status: 0,
      message: '任务草案已创建',
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

    res.send({
      status: 0,
      message: '获取运行详情成功',
      data: run
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
