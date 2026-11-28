# HERE PC 管理端

HERE 校园安全与心理健康协同管理平台的工作人员 Web 客户端。

系统组成见[项目说明](../README.md)，启动 API 见[后端说明](../backend/README.md)。从仓库根目录运行以下命令。Vite 需要 Node.js 20.19+ 或 22.12+。

```powershell
Set-Location pc-web
npm ci
Copy-Item .env.example .env.local
npm run dev
```

开发 API 地址通过 `.env.local` 中的 `VITE_API_URL` 设置，参考 `.env.example`。

## 比赛版四角色演示入口

默认生产构建不展示任何演示账号。只有在线上后端已连接独立的虚构比赛数据库后，才在构建机忽略提交的 .env.local 中显式设置 VITE_CONTEST_DEMO_MODE=true，并配置四个角色对应的 VITE_DEMO_*_EMAIL 与 VITE_DEMO_*_PASSWORD（见 .env.example）。配置齐全的角色才显示快捷填充入口。

使用 backend/scripts/seed_contest_demo.py 创建数据库时，三个新角色的演示邮箱为 psychologist@here-demo.invalid、director@here-demo.invalid、admin@here-demo.invalid；辅导员使用生成脚本时指定的演示邮箱。请将实际为这些专用身份创建的演示密码与构建配置对应。

VITE_* 变量会编译到公开 JavaScript 中，不能用于保护真实账号密码。公开比赛演示尤其不得连接真实业务库或暴露真实管理员账号。管理员操作能力应限制在隔离的虚构数据实例，比赛后停止开放。无须将任何实际配置或数据文件提交 Git。

本地开发仍保留开发专用快捷填充。生产部署需要重新构建管理端，并核对公开链接、登录结果及数据库中对应的身份。
