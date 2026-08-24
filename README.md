# SmartTask 智能任务管理平台

SmartTask 是一个前后端分离的智能任务管理系统，围绕任务协作、权限控制、通知提醒、AI Agent、知识库检索增强和数据看板展开。

项目包含 React + Vite + TypeScript 前端，以及 Express + MySQL 后端。当前已实现任务管理、成员协作、权限控制、邮件验证码、到期提醒、Agent 任务拆解、周报/进度总结、知识库 RAG 检索增强和可视化统计。

## 核心功能

### 用户与认证

- 邮箱验证码注册与邮箱密码登录。
- `JWT Access Token + Refresh Token Cookie` 双令牌认证。
- 支持获取和修改个人资料、修改密码、更新头像。

### 任务管理

- 创建、查看、更新、删除任务。
- 支持任务标题、描述、开始时间、截止时间、完成状态。
- 仪表盘按任务时间和状态分组展示。
- 支持拖拽排序并持久化任务顺序。

### 协作与权限

- 创建任务时自动将创建者绑定为 `admin`。
- 基于 `role / permission / user_task_role` 做任务级权限控制。
- 内置权限包括 `create_task`、`edit_task`、`delete_task`、`view_task`、`member_manage`。
- 支持邀请成员加入任务、成员接受邀请、查看成员和移除成员。

### 通知与提醒

- 消息中心展示协作邀请和系统提醒。
- 后端定时任务每分钟扫描未来 24 小时内即将到期且未提醒过的任务。
- 到期提醒写入 `notification` 表，前端轮询展示。

### AI Agent

已实现 3 类 Agent：

- `task_planner`：根据用户目标自动拆解任务草稿。
- `progress_summary`：汇总当前任务进展、风险和下一步动作。
- `weekly_report`：根据任务生成结构化周报。

Agent 工作流包含：

- 读取当前用户任务。
- 检索个人知识库。
- 流式返回执行过程和结果。
- 生成任务草稿。
- 用户确认后批量写入任务系统。
- 保存最近运行记录，支持查看详情和删除。

## RAG 知识库

项目已接入面向个人知识库场景的 RAG 流程，用于让 Agent 在任务规划、进度总结和周报生成前检索用户私有知识。当前实现包含 Markdown chunk 切分、Embedding 生成、Qdrant 向量检索、关键词召回、混合召回去重、rerank 重排和 Agent 上下文注入。

### 当前 RAG 流程

```text
用户录入 Markdown 知识文档和元数据
→ 保存到 knowledge_document
→ 按 Markdown 标题层级自动切分为 chunk
→ 调用 Embedding 模型生成向量
→ 保存到 MySQL knowledge_chunk
→ 同步 upsert 到 Qdrant collection

Agent 执行
→ 用户输入生成 query embedding
→ Qdrant 向量召回候选片段
→ 关键词召回候选片段
→ 合并去重形成候选集
→ rerank 对候选片段按相关性重排
→ 截取 Top-K 相关知识片段
→ 注入 Agent 上下文
→ DeepSeek 生成任务规划、进度总结或周报
```

### 实现说明

- 文档原文、Markdown 格式标记和元数据存储在 MySQL 表 `knowledge_document`。
- 文档 chunk、章节路径、元数据快照和向量仍存储在 MySQL 表 `knowledge_chunk`，作为业务数据和降级检索来源。
- Qdrant 作为独立向量数据库，负责低延迟 Top-K 向量检索，并通过 payload 中的 `user_id` 做用户级过滤。
- 检索阶段采用 hybrid retrieval：Qdrant 向量召回和关键词召回并行执行，再合并去重。
- 重排阶段通过 `rerankService` 对候选片段二次评分；rerank 模型不可用时自动回退到本地启发式重排。
- 如果 Qdrant 未配置或访问失败，系统会回退到 MySQL 中的 embedding 暴力余弦相似度检索，保证开发和演示流程可用。
- 如果没有可用的真实 Embedding 配置，可使用本地 fallback embedding 跑通开发流程。
- 当前 RAG 更适合个人或中小规模知识库；如果要达到企业级生产 RAG，还需要补充系统化评测集、召回率指标、答案忠实性检测、上下文压缩和更完善的可观测性。

### 相关后端模块

- `backend/services/embeddingService.js`：生成 embedding，支持 OpenAI 兼容接口和本地 fallback。
- `backend/services/vectorStoreService.js`：负责 Qdrant collection 创建、向量 upsert、删除同步和向量检索。
- `backend/services/rerankService.js`：负责候选知识片段 rerank，并提供本地启发式降级。
- `backend/services/knowledgeChunkService.js`：负责文档切块、chunk 表创建、MySQL 入库和 Qdrant 同步。
- `backend/services/knowledgeBaseService.js`：负责 hybrid retrieval、候选合并、rerank 和 Top-K 返回。
- `backend/services/knowledgeDocumentService.js`：负责知识文档增删改查，并同步维护 chunk。
- `backend/scripts/rebuildKnowledgeChunks.js`：用于回填历史知识文档的 chunk、embedding 和 Qdrant 向量索引。

### Embedding 配置

聊天生成使用 DeepSeek，Embedding 使用阿里百炼 OpenAI 兼容接口。配置位于 `backend/.env`：

```env
OPENAI_API_KEY=你的 DeepSeek Key
OPENAI_BASE_URL=https://api.deepseek.com

EMBEDDING_API_KEY=你的阿里百炼 Key
EMBEDDING_BASE_URL=https://你的业务空间域名/compatible-mode/v1
EMBEDDING_MODEL=text-embedding-v3
EMBEDDING_DIMENSIONS=1024
EMBEDDING_PROXY_URL=
EMBEDDING_LOCAL_FALLBACK=false

VECTOR_STORE_ENABLED=true
VECTOR_STORE_PROVIDER=qdrant
QDRANT_URL=https://你的 Qdrant Cloud 集群地址
QDRANT_API_KEY=你的 Qdrant API Key
QDRANT_COLLECTION=knowledge_chunks

RERANK_ENABLED=true
RERANK_MODEL=deepseek-v4-flash
RERANK_CANDIDATE_LIMIT=20
```

如果暂时没有真实 Embedding Key，可以使用开发 fallback：

```env
EMBEDDING_MODEL=
EMBEDDING_LOCAL_FALLBACK=true
```

注意：fallback embedding 只适合开发演示，不等价于真实语义 Embedding。

### 回填历史知识库

如果项目里已经有旧知识文档，需要运行一次回填脚本：

```bash
cd backend
npm run rebuild:knowledge
```

之后新增或更新知识文档时，会按 Markdown 章节重新切 chunk，并结合标题、分类、元数据生成 embedding，同时同步写入 Qdrant。

## 技术栈

### 前端

- React 19
- TypeScript
- Vite
- Ant Design
- Redux Toolkit
- React Router
- React DnD
- Recharts
- Sass

### 后端

- Node.js
- Express
- MySQL / mysql / mysql2
- JWT
- bcryptjs
- nodemailer
- node-schedule
- OpenAI SDK
- DeepSeek Chat API
- 阿里百炼 Embedding API

## 目录结构

```text
.
├── backend/                 # Express 后端
│   ├── app.js               # 应用入口
│   ├── config.js            # 环境变量配置
│   ├── db/                  # MySQL 连接
│   ├── router/              # 路由定义
│   ├── router_handler/      # 控制器
│   ├── services/            # 任务、知识库、RAG、Agent 服务
│   └── scripts/             # 初始化和知识库回填脚本
└── react-vite-ts/           # React 前端
    ├── src/pages/           # 页面
    ├── src/apis/            # 接口封装
    ├── src/services/        # SSE / Agent 流式服务
    ├── src/store/           # Redux 状态管理
    └── src/components/      # 组件
```

## 本地运行

### 1. 准备数据库

项目依赖 MySQL。请先创建数据库：

```sql
CREATE DATABASE smarttask DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

基础业务表包括：

- `user`
- `task`
- `role`
- `permission`
- `role_permission`
- `user_task_role`
- `notification`

知识库相关表会由后端自动创建：

- `knowledge_document`
- `knowledge_chunk`

Agent 运行记录表会由后端自动创建：

- `agent_run`

初始化角色与权限：

```bash
cd backend
node scripts/initRolesAndPermissions.js
```

### 2. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`，并填写：

- MySQL 配置。
- JWT Secret。
- 邮箱 SMTP 配置。
- DeepSeek Chat API 配置。
- 阿里百炼 Embedding API 配置。

### 3. 启动后端

```bash
cd backend
npm install
node app.js
```

默认地址：

```text
http://localhost:3001
```

### 4. 启动前端

```bash
cd react-vite-ts
npm install
pnpm dev
```

默认地址：

```text
http://localhost:5173
```

## 本项目的 RAG 部分

> 项目实现了一个面向智能任务管理场景的 RAG 知识库模块。用户录入 Markdown 知识文档和来源、标签、适用场景等元数据后，系统会按标题层级进行 chunk 切分，并通过阿里百炼 `text-embedding-v3` 生成 1024 维向量。chunk 原文和向量快照保存在 MySQL 中，同时同步到 Qdrant 向量数据库。Agent 执行时，会对用户输入生成 query embedding，通过 Qdrant 向量召回和关键词召回形成候选集，再经过 rerank 重排选出 Top-K 相关知识片段，最后将章节路径、元数据和片段内容注入 DeepSeek 上下文，用于生成任务规划、进度总结或周报。当前实现已经覆盖 RAG 的核心链路，但仍定位为中小规模个人知识库 RAG，企业级生产场景还需要补充系统化评测、答案忠实性校验、监控和权限审计。

## 项目亮点

- 不是单纯 Todo 应用，而是整合了任务管理、协作权限、通知、AI Agent、RAG 知识库和数据看板。
- Agent 支持“生成任务草稿 -> 人工确认 -> 写回任务系统”的闭环。
- 知识库已从关键词检索升级为 Qdrant 向量检索、关键词召回和 rerank 结合的 RAG。
- RAG 支持真实 Embedding 接口、Qdrant 向量数据库和本地 fallback，方便开发和演示。
- 任务摘要和 Agent 结果均支持流式输出，交互体验更完整。
