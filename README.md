# HERE

HERE 是面向高校学生的心理支持应用，包含学生端（手机/网页）、管理端网页和后端服务。本仓库包含全部源码，克隆后可分别构建和运行三个子项目。

## 项目结构

| 目录 | 说明 |
| --- | --- |
| `mobile/` | 学生端，Expo / React Native。同一套源码可打包 Android App 或构建网页版学生端。 |
| `pc-web/` | 管理端网页，React + Vite + Tailwind。包含知识库审核、工单、员工管理、审计等页面。 |
| `backend/` | 后端服务，FastAPI + SQLAlchemy + Alembic。支持 SQLite 和 SQL Server。 |
| `docs/` | 产品需求文档（PRD）和上线部署日志。 |

## 快速开始

### 1. 后端（backend）

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # 按需编辑数据库和密钥配置
python -m uvicorn app.main:app --reload --port 8000
```

健康检查：`http://127.0.0.1:8000/api/v1/health`

### 2. 管理端网页（pc-web）

```bash
cd pc-web
npm install
cp .env.example .env             # 设置 VITE_API_URL 指向后端地址
npm run dev                      # 开发模式
npm run build                    # 生产构建
```

### 3. 学生端（mobile）

```bash
cd mobile
npm install
cp .env.example .env             # 按需填入高德地图 Key 和 API 地址
npm run web                      # 网页版开发模式
npm run bundle:web               # 网页版生产构建，输出到 dist/
npm run android                  # Android 开发模式
```

## 环境变量

每个子项目都提供 `.env.example` 模板。不要把真实密钥提交到仓库。

- `backend/.env`：数据库连接、JWT 密钥、SMTP 邮件、DeepSeek API Key
- `pc-web/.env`：`VITE_API_URL` 指向后端 API 地址
- `mobile/.env`：高德地图 Key（Android / Web / Web Service）、后端 API 地址

## 数据库

后端默认使用 SQLite 开发。连接 SQL Server 时修改 `HERE_DATABASE_URL`。

```bash
cd backend
alembic upgrade head             # 执行迁移
```

## 文档

- 产品需求：`docs/product/HERE_PRD_v0.1_2026-11-05.md`
- 上线部署日志：`docs/deployment-log-2026-11-20-to-23.md`
