# kuanzhai-orbit-all

宽窄 Orbit 完整项目，包含业务后端、六爻 Agent 智能体和 Flutter 移动端。

## 项目结构

```
├── bff/          # 业务 BFF 后端 (Node.js/Express, 端口 3001)
├── agent/        # 六爻 Agent 智能体 (TypeScript/Express, 端口 3000)
└── frontend/     # Flutter 移动端 (v0.7.0)
```

## 架构

```
Flutter App (frontend)
    ↓
BFF 后端 (bff, :3001)  →  OrbitAgent 智能体 (agent, :3000)  →  LLM 大模型
```

## 快速启动

### 1. 环境要求
- Node.js 18+
- MongoDB (localhost:27017)
- Redis (localhost:6380)
- Flutter SDK 3.44+

### 2. 启动 Agent 智能体

```bash
cd agent
cp .env.example .env
# 编辑 .env 填入 LLM API Key
npm install
npm run dev
```

### 3. 启动 BFF 后端

```bash
cd bff
cp .env.example .env
npm install
npm start
```

### 4. 启动前端

```bash
cd frontend
flutter pub get
flutter run
```

### 一键启动 (Windows)

```bash
bff/start-all.bat
```

## 更多文档

各子项目请查看对应目录下的 README.md。
