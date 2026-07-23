import { useEffect, useMemo, useState } from 'react';
import {
  BoldOutlined,
  FileTextOutlined,
  FontSizeOutlined,
  TableOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
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
  { label: '项目资料', value: 'project' },
  { label: '工作规范', value: 'guideline' },
  { label: '汇报模板', value: 'report' },
  { label: '个人笔记', value: 'note' },
  { label: '通用知识', value: 'general' }
];

const markdownTemplate = `# 知识主题

## 背景
- 这里写这篇知识适用的项目、任务或场景。

## 关键规则
- 规则 1：
- 规则 2：

## 执行步骤
1. 第一步：
2. 第二步：

## 注意事项
- 风险或限制：
- Agent 回答时需要优先遵守：
`;

type KnowledgeFormValues = {
  title: string;
  category: string;
  content: string;
  metadataSource?: string;
  metadataTags?: string;
  metadataUseCase?: string;
};

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
  contentPlaceholder: '使用 Markdown 编写，例如：# 背景、## 规则、- 列表、| 表格 |。也可以点击上方模板快速开始。',
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
      content: document.content,
      metadataSource: document.metadata?.source || '',
      metadataTags: Array.isArray(document.metadata?.tags) ? document.metadata.tags.join(', ') : '',
      metadataUseCase: typeof document.metadata?.useCase === 'string' ? document.metadata.useCase : ''
    });
    setOpen(true);
  };

  const handleSubmit = async (values: KnowledgeFormValues) => {
    const payload = {
      title: values.title,
      category: values.category,
      content_format: 'markdown' as const,
      content: values.content,
      metadata: {
        source: values.metadataSource?.trim() || undefined,
        tags:
          values.metadataTags
            ?.split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean) || [],
        useCase: values.metadataUseCase?.trim() || undefined
      }
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateKnowledge(editing.id, payload);
      } else {
        await createKnowledge(payload);
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

  const appendMarkdown = (snippet: string) => {
    const current = String(form.getFieldValue('content') || '');
    const separator = current.trim() ? '\n\n' : '';
    form.setFieldValue('content', `${current}${separator}${snippet}`);
  };

  const applyTemplate = () => {
    const current = String(form.getFieldValue('content') || '');
    if (!current.trim()) {
      form.setFieldValue('content', markdownTemplate);
      return;
    }
    appendMarkdown(markdownTemplate);
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
                <Tag color="blue">Markdown</Tag>
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
              {document.metadata?.source ? <span>{document.metadata.source}</span> : null}
              {Array.isArray(document.metadata?.tags)
                ? document.metadata.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                : null}
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

          <Form.Item label="元数据">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Form.Item name="metadataSource" noStyle>
                <Input placeholder="来源，例如：项目文档 / 会议纪要 / 个人经验" />
              </Form.Item>
              <Form.Item name="metadataTags" noStyle>
                <Input placeholder="标签，多个标签用逗号分隔，例如：周报,前端,规范" />
              </Form.Item>
              <Form.Item name="metadataUseCase" noStyle>
                <Input placeholder="适用场景，例如：生成周报时优先参考" />
              </Form.Item>
            </Space>
          </Form.Item>

          <div className="markdown-toolbar">
            <Button
              htmlType="button"
              size="small"
              icon={<FontSizeOutlined />}
              onClick={() => appendMarkdown('# 标题')}
            >
              H1
            </Button>
            <Button
              htmlType="button"
              size="small"
              icon={<FontSizeOutlined />}
              onClick={() => appendMarkdown('## 小节')}
            >
              H2
            </Button>
            <Button
              htmlType="button"
              size="small"
              icon={<BoldOutlined />}
              onClick={() => appendMarkdown('**重点内容**')}
            >
              加粗
            </Button>
            <Button
              htmlType="button"
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => appendMarkdown('- 条目一\n- 条目二\n- 条目三')}
            >
              列表
            </Button>
            <Button
              htmlType="button"
              size="small"
              icon={<TableOutlined />}
              onClick={() =>
                appendMarkdown('| 字段 | 说明 |\n| --- | --- |\n| 名称 | 内容 |')
              }
            >
              表格
            </Button>
            <Button
              htmlType="button"
              size="small"
              icon={<FileTextOutlined />}
              onClick={applyTemplate}
            >
              模板
            </Button>
          </div>

          <Form.Item
            name="content"
            label={text.contentLabel}
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              className="markdown-editor"
              rows={14}
              placeholder={text.contentPlaceholder}
            />
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
