import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import {
  createKnowledge,
  deleteKnowledge,
  getKnowledgeList,
  updateKnowledge
} from '@/apis/knowledge';
import type { KnowledgeDocument } from '@/types/knowledge';
import './index.scss';

const { TextArea } = Input;

const categoryOptions = [
  { label: '复习规范', value: 'review' },
  { label: '项目文档', value: 'project' },
  { label: '周报模板', value: 'report' },
  { label: '通用知识', value: 'general' }
];

const text = {
  badge: '知识库',
  title: '让 Agent 真正理解你的上下文',
  description:
    '在这里维护个人知识文档，比如复习规范、项目说明、汇报模板。Agent 执行时会按你的输入检索这些知识',
  create: '新增知识',
  edit: '编辑',
  remove: '删除',
  save: '保存',
  cancel: '取消',
  empty: '还没有知识文档，先新增一篇给 Agent 使用。',
  modalCreate: '新增知识文档',
  modalEdit: '编辑知识文档',
  titleLabel: '标题',
  categoryLabel: '分类',
  contentLabel: '内容',
  titlePlaceholder: '例如：前端秋招复习规范 / SmartTask 项目设计约束',
  contentPlaceholder: '输入 Agent 需要参考的知识内容，建议按段落组织。',
  loadFailed: '获取知识库失败，请稍后重试。',
  saveSuccess: '知识文档保存成功。',
  deleteSuccess: '知识文档删除成功。',
  actionFailed: '操作失败，请稍后重试。'
};

const KnowledgeBasePage = () => {
  const [form] = Form.useForm();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const groupedDocuments = useMemo(() => documents, [documents]);

  const loadDocuments = async () => {
    try {
      const res = await getKnowledgeList();
      if (res.status === 0) {
        setDocuments(res.data);
      } else {
        alert(text.loadFailed);
      }
    } catch (error) {
      console.error(error);
      alert(text.loadFailed);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: 'general' });
    setOpen(true);
  };

  const handleOpenEdit = (document: KnowledgeDocument) => {
    setEditing(document);
    form.setFieldsValue({
      title: document.title,
      category: document.category,
      content: document.content
    });
    setOpen(true);
  };

  const handleSubmit = async (values: { title: string; category: string; content: string }) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateKnowledge(editing.id, values);
      } else {
        await createKnowledge(values);
      }
      alert(text.saveSuccess);
      setOpen(false);
      form.resetFields();
      setEditing(null);
      loadDocuments();
    } catch (error) {
      console.error(error);
      alert(text.actionFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteKnowledge(id);
      alert(text.deleteSuccess);
      loadDocuments();
    } catch (error) {
      console.error(error);
      alert(text.actionFailed);
    }
  };

  return (
    <div className="knowledge-page">
      <section className="knowledge-hero">
        <div className="hero-copy">
          <span className="hero-badge">{text.badge}</span>
          <h2 className="hero-title">{text.title}</h2>
          <p className="hero-description">{text.description}</p>
        </div>
        <Button type="primary" onClick={handleOpenCreate}>
          {text.create}
        </Button>
      </section>

      <section className="knowledge-list">
        {groupedDocuments.length === 0 ? <Card className="empty-card">{text.empty}</Card> : null}

        {groupedDocuments.map((document) => (
          <Card
            key={document.id}
            className="knowledge-card"
            title={
              <div className="card-title">
                <span>{document.title}</span>
                <Tag>{document.category}</Tag>
              </div>
            }
            extra={
              <Space>
                <Button type="link" onClick={() => handleOpenEdit(document)}>
                  {text.edit}
                </Button>
                <Popconfirm
                  title="确定删除这篇知识文档吗？"
                  okText={text.remove}
                  cancelText={text.cancel}
                  onConfirm={() => handleDelete(document.id)}
                >
                  <Button type="link" danger>
                    {text.remove}
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <div className="knowledge-meta">
              <span>更新于 {dayjs(document.updated_at).format('YYYY-MM-DD HH:mm')}</span>
            </div>
            <div className="knowledge-content">{document.content}</div>
          </Card>
        ))}
      </section>

      <Modal
        title={editing ? text.modalEdit : text.modalCreate}
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label={text.titleLabel}
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder={text.titlePlaceholder} />
          </Form.Item>

          <Form.Item
            name="category"
            label={text.categoryLabel}
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select options={categoryOptions} />
          </Form.Item>

          <Form.Item
            name="content"
            label={text.contentLabel}
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea rows={10} placeholder={text.contentPlaceholder} />
          </Form.Item>

          <div className="modal-actions">
            <Space>
              <Button onClick={() => setOpen(false)}>{text.cancel}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {text.save}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeBasePage;
