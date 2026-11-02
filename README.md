# Here

Here 是一个面向个人安全与亲友守护场景的移动端 App。项目基于 React Native / Expo 开发，当前形态是一个本地优先的安全守护原型，核心目标是帮助用户记录位置状态、管理紧急联系人、触发求助流程，并为长辈或独居人群提供更简单直接的安全入口。

## 主要功能

- 本地手机号和密码登录/注册
- 身份选择：为我自己、为我的长辈、我是长辈
- 首页实时定位和当前位置展示
- 一键报平安，调起系统短信发送位置
- 紧急联系人管理
- SOS 求救倒计时、拨打 110、发送定位短信
- 行动轨迹记录与轨迹回顾
- 电子围栏设置与越界告警记录
- 长辈模式大字体、高对比、一键报平安/呼救
- 跌倒告警、24 小时失联告警、深夜心跳检测模拟
- 生命状态周报、安全评分和 AI 安全建议
- AI 暖心助手聊天

## 技术栈

- Expo `~54`
- React Native `0.81`
- React `19`
- TypeScript
- React Navigation
- Expo SQLite
- React Native MMKV
- react-native-amap3d
- @react-native-community/geolocation
- DeepSeek Chat API
- EAS Build

## 本地数据

当前项目使用本地 SQLite 数据库 `assignment.db`。数据库初始化入口位于：

```text
app/services/database/
```

主要数据表包括：

- `users`：本地用户、身份和个人档案
- `EmergencyContact`：紧急联系人
- `ActivityLog`：定位轨迹和活动记录
- `AlertLog`：SOS、围栏越界等告警记录
- `geofences`：电子围栏配置
- `schema_migrations`：本地数据库迁移记录

## 项目结构

```text
app/
  app.tsx                  App 根组件
  components/              通用 UI 组件
  context/                 认证等 React Context
  navigators/              App 导航结构
  screens/                 业务页面
  services/
    database/              SQLite 初始化和 repository 骨架
    LocationRecorder.ts    定位、轨迹、围栏检测
  theme/                   主题、颜色、字体、间距
  utils/                   工具函数
assets/                    图标和图片资源
android/                   Expo prebuild 后的 Android 原生工程
```

## 运行

安装依赖：

```powershell
npm install
```

启动开发服务：

```powershell
npm run start
```

运行 Android：

```powershell
npm run android
```

类型检查：

```powershell
npm run compile
```

## 构建

开发 APK：

```powershell
npm run build:android:device
```

预览 APK：

```powershell
npm run build:android:preview
```

生产构建：

```powershell
npm run build:android:prod
```

## 当前状态

项目已经具备完整的安全守护 App 原型能力，但仍处于本地演示阶段。正式发布前需要继续处理：

- 移除前端硬编码 API Key
- 接入真实后端认证和数据同步
- 完善 Android 定位、通知、前台服务和后台任务能力
- 将页面中的零散 SQLite 操作逐步迁移到 `app/services/database/repositories`
- 为 SOS、轨迹、围栏、统计等核心业务补充测试
