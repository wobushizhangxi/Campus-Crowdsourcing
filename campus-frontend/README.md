# Campus Crowdsourcing Frontend

这是校园众包平台的前端应用，基于 React、Vite 和 Tailwind CSS 构建。应用提供任务市场、发布任务、订单管理、消息沟通、钱包、个人中心和管理后台等页面，并通过 `/api` 与 Spring Boot 后端通信。

## 技术栈

- React 19
- Vite 8
- Tailwind CSS 3
- Axios
- lucide-react
- ESLint

## 页面模块

- `HomeView`：任务市场、任务筛选、收藏和任务详情入口。
- `PostTaskView`：任务发布表单。
- `OrdersView`：我发布的任务和我承接的任务。
- `MessagesView`：任务消息会话工作区。
- `WalletView`：余额和流水记录。
- `ProfileView`：个人资料、认证状态和设置入口。
- `AdminView`：用户管理、认证审核、余额调整和权限管理。

## 本地开发

安装依赖：

```powershell
npm install
```

启动开发服务器：

```powershell
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173
```

Vite 开发服务器已在 `vite.config.js` 中配置 `/api` 代理：

```text
/api -> http://127.0.0.1:8080
```

因此本地开发时通常先启动 `campus-backend`，再启动前端。

## 环境变量

如需覆盖 API 地址，可在本地环境文件中设置：

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

默认开发模式会通过相对路径请求 `/api`，交给 Vite 代理转发。

## 常用命令

```powershell
npm run dev      # 启动开发服务器
npm run build    # 构建生产静态资源
npm run lint     # 运行 ESLint
npm run preview  # 预览构建产物
```

## 构建产物

执行构建后，静态资源输出到：

```text
dist/
```

根目录的 `build-software.ps1` 会先执行前端构建，再由后端 Maven 构建流程把 `dist/` 复制到 Spring Boot 静态资源目录，最终打包为可直接运行的后端 JAR。

## 代码结构

```text
src/
├── components/
│   ├── layout/       # 顶部栏、侧边栏、底部导航
│   ├── overlays/     # 聊天等浮层
│   └── pages/        # 页面级组件
├── hooks/            # 账号记忆、聊天和工作区数据
├── services/         # API 请求封装
├── utils/            # 格式化、会话、任务筛选、收藏等工具
├── App.jsx           # 应用状态和页面编排
└── main.jsx          # React 入口
```

## 开发注意事项

- API 请求统一从 `src/services/api.js` 发起，默认自动携带本地 JWT。
- 登录态读写集中在 `src/utils/authSession.js`。
- 任务收藏、任务筛选和头像处理逻辑放在 `src/utils/`，新增逻辑时优先复用这些工具。
- 页面组件应保持和现有移动端/桌面端响应式布局一致。
