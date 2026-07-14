# 智能任务管理平台 SmartTask

一个前后端分离的智能任务管理系统，围绕“任务协作 + 权限控制 + AI 辅助 + 知识沉淀 + 数据看板”展开。当前仓库包含完整的 React 前端和 Express 后端，已实现任务创建与协作、邀请通知、AI 任务拆解、知识库检索增强、流式摘要和可视化统计等能力。

## 项目功能

### 1. 用户与认证

- 邮箱验证码注册
- 邮箱密码登录
- `JWT Access Token + Refresh Token Cookie` 双令牌认证
- 获取和修改个人资料
- 修改密码、更新头像

### 2. 任务管理

- 创建任务，包含标题、描述、开始时间、截止时间
- 任务列表按当前用户可见范围查询
- 任务详情查看
- 更新任务描述与完成状态
- 删除任务
- 仪表盘中按时间和状态自动分组为：
  - 进行中
  - 待开始
  - 已逾期
  - 已完成
- 支持拖拽排序，并持久化任务顺序

### 3. 协作与权限

- 创建任务时自动把创建者绑定为 `admin`
- 基于 `role / permission / user_task_role` 的任务级权限控制
- 当前脚本内置的权限包括：
  - `create_task`
  - `edit_task`
  - `delete_task`
  - `view_task`
  - `member_manage`
- 支持邀请成员加入任务
- 被邀请成员可在消息中心接受邀请
- 支持查看任务成员、移除成员

### 4. 通知与提醒

- 消息中心展示协作邀请和系统提醒
- 后端定时任务每分钟扫描一次未来 24 小时内到期且未提醒过的任务
- 到期提醒会写入 `notification` 表，前端轮询展示

### 5. AI 能力

#### 任务流式摘要

- 支持基于任务描述生成 AI 摘要
- 使用 `SSE` 流式返回内容
- 前端具备断线重连和断点续传处理

#### Agent 工作台

已实现 3 类 Agent：

- `task_planner`：根据目标自动拆解任务草案
- `progress_summary`：汇总当前任务进展、风险和下一步动作
- `weekly_report`：根据任务生成结构化周报

Agent 工作流包含：

- 读取当前用户任务
- 检索个人知识库内容
- 流式返回推理过程和结果
- 对任务拆解结果生成草案
- 用户确认后批量写入任务系统
- 保存最近运行记录，可查看详情和删除记录

### 6. 知识库

- 用户可创建、编辑、删除个人知识文档
- 文档支持分类：
  - `review`
  - `project`
  - `report`
  - `general`
- 后端会自动创建 `knowledge_document` 表
- Agent 执行时会对知识文档做简单分词、切块和相关性匹配，用于检索增强

### 7. 数据可视化

看板页面基于 `Recharts` 展示：

- 任务完成占比饼图
- 每日任务创建趋势折线图
- 每日到期任务数量柱状图

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

## 目录结构

```text
.
├─ backend/                 # Express 后端
│  ├─ app.js                # 应用入口
│  ├─ config.js             # JWT、邮箱、AI 配置
│  ├─ db/                   # MySQL 连接
│  ├─ router/               # 路由定义
│  ├─ router_handler/       # 控制器
│  ├─ services/             # 任务、知识库、Agent 服务
│  ├─ scripts/              # 角色权限初始化脚本
│  └─ runtime/              # Agent 运行记录
└─ react-vite-ts/           # React 前端
   ├─ src/pages/            # 页面
   ├─ src/apis/             # 接口封装
   ├─ src/services/         # SSE / Agent 流式服务
   ├─ src/store/            # Redux 状态管理
   └─ src/components/       # 组件
```

## 页面说明

- `/login`：登录 / 注册
- `/dashboard`：任务面板
- `/task/:id`：任务详情、成员、删除操作
- `/barchart`：实时看板
- `/agent`：Agent 工作台
- `/knowledge`：知识库
- `/report`：消息中心
- `/profile`：个人中心

## 本地运行

### 1. 准备数据库

项目依赖 MySQL，默认连接配置写在以下文件中：

- `backend/db/index.js`
- `backend/router_handler/summary.js`
- `backend/scripts/initRolesAndPermissions.js`

当前代码中的默认数据库配置为：

- host: `127.0.0.1`
- user: `root`
- password: `123456`
- database: `smarttask`

你需要先创建 `smarttask` 数据库，并准备项目运行所需的基础表，例如：

- `user`
- `task`
- `role`
- `permission`
- `role_permission`
- `user_task_role`
- `notification`

说明：

- `knowledge_document` 表会在首次访问知识库时自动创建
- 角色和权限可以通过脚本初始化

初始化角色与权限：

```bash
cd backend
node scripts/initRolesAndPermissions.js
```

### 2. 启动后端

```bash
cd backend
npm install
node app.js
```

默认启动地址：

```text
http://localhost:3001
```

### 3. 启动前端

```bash
cd react-vite-ts
npm install
npm run dev
```

默认启动地址：

```text
http://localhost:5173
```

## AI 与邮件配置

当前仓库中的 AI、邮箱、JWT 等配置集中在 `backend/config.js`，AI 客户端封装位于 `backend/openai.js`。

当前实现特点：

- 后端调用 OpenAI SDK
- `baseURL` 指向 `https://api.deepseek.com`
- 模型名使用 `deepseek-v4-flash`
- 邮箱验证码通过 QQ SMTP 发送
- 默认允许前端地址 `http://localhost:5173` 跨域访问

## 当前实现说明

这个仓库目前更偏向“可运行原型 / 毕设项目 / 课程项目”形态，业务主链路已经具备，但还有一些工程化点值得继续完善：

## 仓库亮点

- 不是单纯的 Todo 应用，而是把任务系统、协作权限、通知、知识库和 AI 工作流串起来了
- Agent 支持“生成任务草案 -> 人工确认 -> 写回任务系统”的闭环
- 知识库已接入到 Agent 检索链路中，具备基础的检索增强能力
- 任务摘要和 Agent 结果都支持流式输出，交互体验比同步接口更完整

## 后续可扩展方向

- 补充数据库初始化 SQL 与 Docker Compose
- 将所有敏感配置迁移到环境变量
- 为任务、通知、知识库补充分页和搜索
- 给 Agent 增加更多工具能力，例如自动更新任务状态、生成日报
- 增加 WebSocket 或 Socket.IO 实时协作，而不是仅依赖轮询
