# 若木的小世界

前台与 API 使用 Next.js 15 / React 19 / Prisma 6 / MySQL / Redis，后台在独立的 my-blog-admin 仓库。两仓均使用 pnpm 12.3.4，各自保留 pnpm-lock.yaml；CI 和部署使用 Node 24。旧 /frontend 链接继续重定向；内容 URL 不批量重写。

## 本地开发

配置 DATABASE_URL、JWT_SECRET、ADMIN_USERNAME、ADMIN_PASSWORD、REDIS_HOST/PORT/PASSWORD、SYNC_API_TOKEN。不要把凭据提交到仓库。NEXT_PUBLIC_SITE_URL 控制公开 canonical/RSS 地址。生产进程绑定 127.0.0.1，代理须覆盖 X-Real-IP 后再启用 TRUST_PROXY=true。

```sh
npm install -g pnpm@12.3.4
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm dev
```

前台路由为 /、/allBlogs、/notes、/allStatus、/posts/[slug]、/notes/[slug]、/status/[id]、/archive、/tags/[tag]、/series/[slug] 和 /feed.xml。默认 API 仅公开，管理列表/详情用 scope=admin 和 Authorization header。新增文章/普通笔记需要 UUID Idempotency-Key。

## 隔离验收

Docker 只创建 blog-optimization-test 项目，端口 MySQL 13316、Redis 16386，测试不会使用开发或正式库。

```sh
docker compose -p blog-optimization-test -f tests/compose.yaml up -d --wait
# 设置 DATABASE_URL=mysql://root:local-test-only@127.0.0.1:13316/blog_test
pnpm exec prisma migrate deploy
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright 使用 3197，拒绝复用已占用服务器。前后台配对验收：先在后台以 BLOG_API_BASE_URL=http://127.0.0.1:8000 构建，再设置 ADMIN_E2E_DIR 指向后台仓库运行 test:e2e；8000 由隔离验收代理使用。

## 数据与发布

新增迁移只扩展结构并保留历史公开状态。Note 摘要使用 scripts/backfill.ts，默认 dry-run；明确设置 BACKFILL_DATABASE_URL 后才运行 --apply。scripts/privacy-audit.ts 只读输出公开内容待审清单，明确设置 AUDIT_DATABASE_URL。不要把隐私清单上传公共仓库。

实施、路由权限、验收与回滚见 [docs/博客优化实施计划.md](docs/博客优化实施计划.md)、[docs/路由权限矩阵.md](docs/路由权限矩阵.md)。正式迁移前验证备份恢复，按阶段评审 PR 后合并。安全回滚不能退回匿名写入或草稿可读的版本。

自动备份、恢复核验、API 能力检测和健康回退见 [docs/部署前置检查与发布顺序.md](docs/部署前置检查与发布顺序.md)。日常更新合并 main 后通过 CI 自动部署，不再手填就绪标志；手动 Run workflow → main 可重跑当前版本。

依赖脚本批准在 pnpm-workspace.yaml；Prisma 使用显式 generate，不依赖安装时自动执行。pnpm 版本不符会失败，不隐式切换。部署使用已有 Node 24；服务器只有 Node 20 时，通过现有 npm 准备用户目录内的 Node 24，再安装版本化 pnpm 工具，无需 nvm 或全局升级。在全新 release 目录安装生产依赖，切换 PM2 后检查健康，通过后更新 current；保留旧 node_modules 供回退。保留策略和 PR 汇总见 [docs/main补齐与服务器依赖切换.md](docs/main补齐与服务器依赖切换.md)，前次迁移验收见 [docs/pnpm迁移验收.md](docs/pnpm迁移验收.md)。
