const { streamAgentRun, writeEvent } = require('../services/agentService');
const { createTaskForUser, getUserTasks } = require('../services/taskService');

exports.streamAgent = async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  try {
    await streamAgentRun({
      userId: req.user.id,
      agentType: req.body.agentType,
      input: req.body.input,
      res
    });
    res.end();
  } catch (error) {
    console.error('agent stream failed:', error);
    writeEvent(res, 'error', { message: error.message || 'Agent 执行失败' });
    res.end();
  }
};

exports.confirmDrafts = async (req, res) => {
  const drafts = Array.isArray(req.body.drafts) ? req.body.drafts : [];
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
