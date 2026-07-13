const { streamAgentRun, writeEvent } = require('../services/agentService');
const { createTaskForUser, getUserTasks } = require('../services/taskService');
const { createRun, updateRun, listRuns } = require('../services/agentRunLogService');

exports.streamAgent = async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  const run = createRun({
    userId: req.user.id,
    agentType: req.body.agentType,
    input: req.body.input
  });

  writeEvent(res, 'run_started', {
    runId: run.id,
    startedAt: run.startedAt
  });

  try {
    const result = await streamAgentRun({
      userId: req.user.id,
      agentType: req.body.agentType,
      input: req.body.input,
      res
    });

    updateRun(run.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      knowledgeHits: result.knowledgeHits,
      draftCount: result.draftCount,
      summary: result.assistantText.slice(0, 800)
    });

    writeEvent(res, 'done', {
      ok: true,
      runId: run.id,
      draftCount: result.draftCount
    });
    res.end();
  } catch (error) {
    console.error('agent stream failed:', error);
    updateRun(run.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      summary: error.message || 'Agent execution failed'
    });
    writeEvent(res, 'error', {
      message: error.message || 'Agent 执行失败',
      runId: run.id
    });
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
      updateRun(runId, {
        status: 'confirmed',
        confirmedTaskIds: createdTaskIds
      });
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

exports.getRuns = (req, res) => {
  try {
    res.send({
      status: 0,
      message: '获取 Agent 运行记录成功',
      data: listRuns()
    });
  } catch (error) {
    res.cc(error);
  }
};
