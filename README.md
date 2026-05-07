# Campus Crowdsourcing

Campus Crowdsourcing 是一个面向校园场景的众包服务平台，用于发布、承接、沟通和管理校内互助任务。项目采用前后端分离开发，前端提供移动优先的任务市场体验，后端负责认证授权、任务生命周期、钱包流水、消息和后台管理等核心能力。

## 功能亮点

- 账号认证：支持注册、登录、JWT 会话和自动登录。
- 任务市场：支持任务发布、分类浏览、收藏、筛选、接单、完成确认和状态流转。
- 即时沟通：围绕任务建立沟通入口，便于发布者和接单者协作。
- 个人中心：管理个人资料、头像、认证状态、历史记录和钱包信息。
- 钱包流水：展示余额变化、收入支出和交易记录。
- 管理后台：支持用户检索、认证审核、余额调整和管理员权限控制。
- 桌面与移动适配：前端覆盖底部导航、侧边栏和大屏消息工作区。
- 一键打包：提供 PowerShell 脚本构建前端、后端 JAR 和可携带应用包。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React 19, Vite, Tailwind CSS, Axios, lucide-react |
| 后端 | Java 17, Spring Boot 4, Spring Security, Spring Data JPA |
| 数据库 | MySQL, H2 测试运行时 |
| 认证 | JWT |
| 构建 | npm, Maven Wrapper, PowerShell, jpackage |

## 目录结构

```text
.
├── campus-backend/          # Spring Boot 后端服务
├── campus-frontend/         # React + Vite 前端应用
├── config/                  # 本地配置示例与运行时配置
├── branding/                # 应用图标与品牌素材
├── docs/                    # 设计文档和实现计划
├── release/                 # 构建产物目录，已在 .gitignore 中忽略
├── build-software.ps1       # 构建前端、后端和便携包
├── run-software.ps1         # 运行已打包应用
└── start-public-access.ps1  # 可选公网访问辅助脚本
```

## 本地运行

### 环境要求

- JDK 17 或更新版本
- Node.js 和 npm
- MySQL 8.x 或兼容版本
- Windows PowerShell（使用仓库提供的一键脚本时需要）

### 1. 准备数据库

创建本地数据库：

```sql
CREATE DATABASE campus_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

复制配置示例：

```powershell
Copy-Item config\application-local.example.properties config\application-local.properties
```

然后按本机环境修改 `config/application-local.properties`：

```properties
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/campus_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai&characterEncoding=utf8
spring.datasource.username=root
spring.datasource.password=your-mysql-password

app.security.jwt.secret=replace-with-a-long-random-secret
app.security.admin.username=admin001
app.security.admin.password=change-this-admin-password
app.security.admin.name=平台管理员
```

### 2. 启动后端

```powershell
cd campus-backend
.\mvnw.cmd spring-boot:run
```

默认服务地址为 `http://127.0.0.1:8080`。

### 3. 启动前端

```powershell
cd campus-frontend
npm install
npm run dev
```

默认前端地址为 `http://127.0.0.1:5173`。开发服务器已配置 `/api` 代理到 `http://127.0.0.1:8080`。

## 构建与发布

一键构建前端静态资源、后端 JAR，并在支持 `jpackage` 的 JDK 环境中生成便携应用包：

```powershell
.\build-software.ps1
```

跳过后端测试构建：

```powershell
.\build-software.ps1 -SkipTests
```

运行已构建应用：

```powershell
.\run-software.ps1
```

不自动打开浏览器：

```powershell
.\run-software.ps1 -NoBrowser
```

## 常用命令

前端：

```powershell
cd campus-frontend
npm run dev
npm run build
npm run lint
npm run preview
```

后端：

```powershell
cd campus-backend
.\mvnw.cmd test
.\mvnw.cmd package
.\mvnw.cmd spring-boot:run
```

## 配置说明

后端默认读取 `campus-backend/src/main/resources/application.properties`，并额外加载：

- `classpath:application-local.properties`
- `./config/application-local.properties`

建议把数据库密码、JWT 密钥、管理员账号等敏感信息放在 `config/application-local.properties` 或环境变量中。该文件已被 `.gitignore` 忽略，不应提交到仓库。

前端可通过 `VITE_API_BASE_URL` 指定 API 地址。开发模式下通常直接使用 Vite 代理即可。

## 测试

后端测试覆盖认证、安全引导、用户自助操作、任务完成流程和任务市场核心升级等场景：

```powershell
cd campus-backend
.\mvnw.cmd test
```

前端当前提供 ESLint 检查和若干工具函数测试文件。常规检查命令：

```powershell
cd campus-frontend
npm run lint
npm run build
```

## 截图

当前仓库尚未放置正式截图。建议后续在 `docs/screenshots/` 中补充以下页面截图，并在本节展示：

- 登录与注册
- 首页任务市场
- 发布任务
- 订单/历史记录
- 消息工作区
- 钱包与个人中心
- 管理后台

## 开发提示

- 业务配置不要直接写入 `application.properties`。
- `release/`、前端日志和本地配置文件已被 `.gitignore` 忽略。
- 打包前先执行前端构建，后端 Maven 构建会把 `campus-frontend/dist` 复制到后端静态资源目录。
- 如果需要公网演示，可参考 `start-public-access.ps1` 和 `stop-public-access.ps1`。

