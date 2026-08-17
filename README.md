# 若木的小世界 - 个人博客（my-blog）

基于 [Next.js](https://nextjs.org) 15 构建的个人博客系统**前端展示站 + API 服务**，使用 React 18、Tailwind CSS 4、Prisma ORM 和 MySQL/MariaDB（远程阿里云服务器），采用时间轴样式展示博客文章与动态。

## 技术栈

- **框架**: Next.js 15.5.9（App Router + Turbopack）
- **UI**: React 18.3.1 + Tailwind CSS 4 + antd + @uiw/react-md-editor（Markdown 编辑器）
- **数据**: Prisma 6 + MySQL/MariaDB（远程）、Redis（ioredis）
- **其他**: JWT 登录、七牛云图床、智谱 AI（GLM）

## 快速开始（本地完整启动）

> **数据库在阿里云服务器上**，本地通过 SSH 隧道访问，因此启动顺序是：**先开隧道 → 再启动服务**。

### 0. 环境要求

- Node.js ≥ 20，pnpm
- `~/.ssh/config` 已配置 `my-blog-db` 别名（隧道依赖它）：

```
Host my-blog-db
    HostName 101.132.178.33
    User root
    IdentityFile ~/.ssh/id_ed25519
```

### 1. 安装依赖

```bash
pnpm install
```

### 2. 打开数据库 SSH 隧道

```bash
pnpm tunnel
```

该命令执行 `ssh -L 3307:localhost:3306 -N my-blog-db`（已带 keepalive 参数，防止服务端空闲断连）：把**本地 3307 端口**转发到远程服务器的 **3306（MySQL）**。保持终端运行，不要关闭。

> **断线自动重连（推荐）**：长时开发建议改用 `scripts/tunnel.ps1`（`pwsh -File scripts/tunnel.ps1`），ssh 断开后每 5 秒自动重连，无需手动干预。

### 3. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看博客前台（`/frontend`）。

### 4. 启动管理后台（可选）

后台位于同仓库的 `admin/` 目录，详见 [admin/README.md](../admin/README.md)。三个服务同时运行时为：

| 服务 | 命令 | 地址 |
|------|------|------|
| 数据库隧道 | `cd my-blog && pnpm tunnel` | 本地 3307 → 远程 3306 |
| my-blog API | `cd my-blog && pnpm dev` | http://localhost:3000 |
| admin 后台 | `cd admin && npm run start:dev` | http://localhost:8000 |

## 环境变量（.env）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接串，指向 `127.0.0.1:3307`（隧道端口） |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 配置 |
| `NEXT_PUBLIC_BASE_URL` | 图片引用等公共 URL |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 后台登录账号密码（由 `/api/login` 校验） |
| `JWT_SECRET` | JWT 签名密钥 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL_NAME` | 智谱 AI 配置 |
| `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY` / `QINIU_BUCKET_NAME` / `QINIU_DOMAIN` | 七牛云图床配置 |

## 项目结构

```
app/
├── page.tsx            # 根路径重定向到 /frontend
├── frontend/           # 前台页面（博客、动态、关于）
└── api/                # REST API（posts、dynamics、categories、tags、login、upload）
components/             # 可复用组件（Header、Contact、NewBlogs、NewStatus、MyEditor）
lib/prisma.ts           # Prisma 客户端单例
prisma/schema.prisma    # 数据库 schema
```

## 数据库模型

```
Post      - 博客文章（title、slug、content、excerpt、cover、published、category、tags）
Category  - 文章分类（与 Post 一对多）
Tag       - 标签（与 Post 多对多，经 PostTag）
PostTag   - Post-Tag 关联表
Dynamic   - 短动态（content、excerpt、title）
```

## 常用命令

```bash
pnpm dev                       # 开发服务器（Turbopack，端口 3000）
pnpm tunnel                    # SSH 隧道：本地 3307 → 远程 MySQL 3306
pnpm build                     # 生产构建
pnpm start                     # 运行生产服务器
pnpm lint                      # ESLint
pnpm prisma generate           # 生成 Prisma Client
pnpm prisma migrate deploy     # 部署数据库迁移
```

## 部署

通过 GitHub Actions（`.github/workflows/deploy.yml`，push 到 `main` 触发）部署到阿里云服务器 `/home/www/my-blog`，使用 PM2 管理进程，构建时自动执行 Prisma 迁移。

## 相关项目

- [admin](../admin/README.md) - 个人博客管理后台（Ant Design Pro / Umi Max）

## 许可证

MIT
