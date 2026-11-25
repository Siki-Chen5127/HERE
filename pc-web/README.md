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
