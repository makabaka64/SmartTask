const {
  listKnowledgeDocuments,
  createKnowledgeDocument,
  updateKnowledgeDocument,
  deleteKnowledgeDocument
} = require('../services/knowledgeDocumentService');

exports.getKnowledgeList = async (req, res) => {
  try {
    const data = await listKnowledgeDocuments(req.user.id);
    res.send({
      status: 0,
      message: '获取知识库成功',
      data
    });
  } catch (error) {
    res.cc(error);
  }
};

exports.createKnowledge = async (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.cc('标题和内容不能为空');
  }

  try {
    const id = await createKnowledgeDocument(req.user.id, { title, content, category });
    res.send({
      status: 0,
      message: '知识文档创建成功',
      data: { id }
    });
  } catch (error) {
    res.cc(error);
  }
};

exports.updateKnowledge = async (req, res) => {
  const { title, content, category } = req.body;
  const documentId = Number(req.params.id);
  if (!documentId || !title || !content) {
    return res.cc('参数不完整');
  }

  try {
    const result = await updateKnowledgeDocument(req.user.id, documentId, { title, content, category });
    if (result.affectedRows !== 1) {
      return res.cc('文档不存在或无权限修改');
    }
    res.send({
      status: 0,
      message: '知识文档更新成功'
    });
  } catch (error) {
    res.cc(error);
  }
};

exports.removeKnowledge = async (req, res) => {
  const documentId = Number(req.params.id);
  if (!documentId) {
    return res.cc('文档 ID 缺失');
  }

  try {
    const result = await deleteKnowledgeDocument(req.user.id, documentId);
    if (result.affectedRows !== 1) {
      return res.cc('文档不存在或无权限删除');
    }
    res.send({
      status: 0,
      message: '知识文档删除成功'
    });
  } catch (error) {
    res.cc(error);
  }
};
