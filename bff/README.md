# 宽窄·Orbit 后端 BFF 服务

Node.js + Express 搭建的六爻占卜后端服务，为 Flutter APP「宽窄·Orbit」提供完整 API。

深度对接 [OrbitAgent](https://github.com/erwinmsmith/OrbitAgent) 六爻 AI 引擎，接入智谱 GLM-4-Flash / DeepSeek 等 LLM 模型。

## 项目概述

宽窄·Orbit 是一个体验型六爻占卜应用，用户通过"仪式"完成一次完整的情感体验。本仓库是后端 BFF 层，负责：

- 用户管理：Mock 登录 / 邀请码登录
- 仪式管理：创建会话、AI 解读、追问、历史记录
- Agent 对接：将 Flutter App 请求转换为 OrbitAgent 调用，并通过 `/divination/ask` 获取完整六爻 AI 解读
- 兼容层：提供 `/liuyao/app/*` 路由，兼容 zhouyi_app Flutter App 的 API 格式

## 项目组成

整个系统由三个部分组成：

| 项目 | GitHub | 说明 |
|------|--------|------|
| **kuanzhai-orbit-server** | /qi-origin/kuanzhai-orbit-server | BFF 后端（本项目），端口 3001 |
| **orbit-flutter** | /qi-origin/orbit-flutter | Flutter App 前端，端口 8888 |
| **OrbitAgent** | /erwinmsmith/OrbitAgent | 六爻 AI 引擎（上游），端口 3000 |

## 核心功能

- 6 个 RESTful API：登录 / 创建仪式 / AI 解读 / 追问 / 详情 / 历史
- zhouyi_app 兼容路由：`/liuyao/app/chat/start` 等 4 个接口
- OrbitAgent 对接：调用 `/divination/ask` 获取完整六爻深度解读报告
- Mock 降级：Agent 不可用时自动返回 Mock 数据
- 内存存储：MVP 阶段使用 Map 存储，预留数据库替换接口
- 统一 JSON 响应格式
- Bearer Token 鉴权 + JWT 支持

## 快速开始

```bash
npm install
copy .env.example .env
npm start
```

需要先启动 OrbitAgent（端口 3000），然后启动 BFF（端口 3001）。

## 系统架构

```
Flutter App (orbit-flutter :8888)
    ↓
BFF (本服务 :3001)           ← 用户/会话管理、接口适配
    ↓ /liuyao/app/chat/start
OrbitAgent (:3000)            ← 六爻排盘、LLM 解读、RAG 知识库
    ↓ /divination/ask
智谱 GLM-4-Flash / DeepSeek  ← 生成完整六爻深度报告
```

## API 接口

### BFF 核心接口

| # | 方法 | 路径 | 鉴权 | 说明 |
|---|------|------|------|------|
| 1 | POST | `/api/v1/auth/mock-login` | 无 | 测试登录，返回 token |
| 2 | POST | `/api/v1/rituals` | Bearer | 创建仪式会话（问题、六爻位、动爻） |
| 3 | POST | `/api/v1/rituals/:id/interpret` | Bearer | 首轮 AI 六爻解读（调 Agent /ask） |
| 4 | POST | `/api/v1/rituals/:id/followups` | Bearer | 追问 |
| 5 | GET  | `/api/v1/rituals/:id` | Bearer | 会话详情（含解读+追问记录） |
| 6 | GET  | `/api/v1/me/ritual-records` | Bearer | 用户历史记录 |

### zhouyi_app 兼容路由

| # | 方法 | 路径 | 鉴权 | 说明 |
|---|------|------|------|------|
| 1 | GET  | `/api/v1/liuyao/app/health` | 无 | 健康检查 |
| 2 | POST | `/api/v1/liuyao/app/chat/start` | 无 | 起卦 + AI 解读 |
| 3 | POST | `/api/v1/liuyao/app/chat/continue` | 无 | 追问 |
| 4 | GET  | `/api/v1/liuyao/app/chat/session/:id` | 无 | 会话历史 |

### 项目结构

```
kuanzhai-orbit-server/
├── src/
│   ├── server.js              # Express 入口（CORS、鉴权、路由挂载）
│   ├── config/index.js        # 环境变量集中管理
│   ├── middleware/
│   │   ├── auth.js            # Bearer 鉴权 + JWT 解析
│   │   └── errorHandler.js    # 统一错误处理
│   ├── store/
│   │   └── index.js           # 内存存储 + lines→yaoValues 转换 + TAG_TO_TYPE 映射
│   ├── services/
│   │   ├── agent.service.js   # OrbitAgent 对接（含 mock 降级 + directAsk）
│   │   └── ritual.service.js  # 仪式业务逻辑（创建、解读、追问、详情、历史）
│   ├── controllers/
│   │   ├── auth.controller.js # mock-login + invite 登录
│   │   ├── ritual.controller.js
│   │   └── me.controller.js
│   ├── routes/
│   │   ├── auth.routes.js     # /auth/* + /liuyao/app/* 兼容路由
│   │   ├── ritual.routes.js
│   │   └── me.routes.js
│   └── utils/
│       └── response.js        # 统一 JSON 输出 ok() / fail()
├── .env.example
├── package.json
├── start-all.bat              # 一键启动脚本
└── README.md
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | BFF 端口 | 3001 |
| AGENT_API_URL | OrbitAgent 地址 | http://127.0.0.1:3000 |
| AGENT_API_KEY | Agent JWT（留空自动获取） | 空 |
| AGENT_TIMEOUT_MS | LLM 超时（毫秒） | 60000 |
| AGENT_DEV_MODE | 自动通过 /dev/token 获取 Agent JWT | true |

### 统一响应格式

成功：
```json
{
  "success": true,
  "message": "ok",
  "data": { ... }
}
```

失败：
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "缺少认证信息"
  }
}
```

### 技术栈

- Node.js / Express
- uuid 生成 token 和 sessionId
- 内存 Map 存储（预留数据库替换接口）
- 对接 OrbitAgent TypeScript 六爻引擎
- LLM：智谱 GLM-4-Flash / DeepSeek V4 Flash

### 数据库状态

当前 MVP 阶段使用内存存储（`store/index.js`）。替换为数据库时，只需实现相同接口：
- `userStore`: `create(nickname)`, `findByToken(token)`
- `ritualStore`: `create(...)`, `findById(id)`, `update(id, patch)`, `addFollowup(id, ...)`, `findByUserId(userId)`

### 补充说明

本项目已完成以下关键修复：
- Agent 对接修复：liuyao/app/chat/start 改用 `/divination/ask` 直连 Agent，获得完整六爻解读报告
- CORS 增强：允许所有来源，确保 Flutter Web App 能够调用后端
- 路由修复：/auth/mock-login 和 /auth/invite 路径回正
- 鉴权增强：支持 BFF token + Agent JWT 双重认证
