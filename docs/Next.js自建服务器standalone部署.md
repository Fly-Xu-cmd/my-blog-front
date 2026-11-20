# Next.js 自建服务器 standalone 部署

本项目使用 Next.js 15 App Router，在 Linux x64/glibc、Node 24 的单台服务器上运行。采用官方 [standalone 输出](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output)与[自托管指南](https://nextjs.org/docs/15/app/guides/self-hosting)，保留 PM2、Nginx 和独立 release 的发布机制。

## 构建和运行

CI 用 pnpm 12.3.4 和冻结锁文件安装，执行测试、类型检查、lint、Prisma generate 与默认的 next build。生产构建使用 Next 15 默认的 Webpack 路径，确保路由 tracing 排除生效，本地 dev 继续使用 Turbopack。next.config.mjs 设置 output: standalone，由 Next 自动追踪并复制运行所需文件；通过官方 outputFileTracingExcludes 排除预编译 JS 服务不需要的 TypeScript 编译器。按官方说明把 public 和 .next/static 补入 .next/standalone；不维护自定义依赖裁剪算法。

迁移与备份所需的 Prisma CLI、mysql2、@next/env 在 deployment/ 工作区包中准备，采用同一份 pnpm-lock.yaml。工具包只有生产根依赖，不继承根项目的开发 peer；CLI 和数据库脚本与应用运行依赖分开。Prisma 客户端及 OpenSSL 1.1/3 原生引擎在 CI 准备，动态加载的客户端文件明确加入 tracing includes。

运行包审计不包含 Playwright/Vitest/ESLint/TypeScript/tsx、根 .env 文件或指向包外的链接；归档及 receipt 绑定发布 ID、构建 ID、package/锁文件与 SHA256。服务器只验证和解压，PM2 使用 Node 24 直接启动 release/server.js；应用仅监听 127.0.0.1，由现有 Nginx 提供公开入口。不在服务器执行 pnpm install、generate 或应用构建。

Node 24 已存在时沿用它；只有旧 Node 时才通过 npm 在 appuser 私有目录准备固定的 Node 24.20.0，最多 180 秒。下载源默认为国内 npmmirror，可通过 BLOG_DEPLOY_NPM_REGISTRY 设置其他不含凭据的 HTTPS 源；全局 Node/npm、旧 node_modules 和旧 release 保留。

## 数据与环境

数据库迁移继续按检查计划、按需备份、隔离恢复核验、再迁移执行。CLI 通过 Node 直接调用，与应用使用相同的保留 PM2 环境和服务器 .env。普通更新没有待执行迁移时跳过 dump/restore/migrate。健康失败恢复旧 PM2 应用配置，保留数据库结构，不用旧备份自动覆盖后续写入。

DATABASE_URL、JWT 与同步凭据仍保存在服务器环境中，不写进运行包。NEXT_PUBLIC_* 在 build 时固化，改变公开域名等构建变量需重新构建。图片由七牛托管，本地上传入口已停用，发布不再要求 UPLOAD_DIR 或旧上传目录存在。既有上传文件与 Nginx 旧资源映射仍保留，完成正式引用审计前不删除。Next 的磁盘缓存属于运行目录，发布后可能重新暖缓存。

Nginx 保持原站点与代理配置。首次生产验收需核对代理 Host/来源地址、动态页面 Cache-Control、静态资源和图片访问；使用流式响应时，按官方指南检查 proxy_buffering off。当前没有读取或修改正式 Nginx 配置，不能据此认定已验收。

## 验收和回退

CI 在独立临时目录解压同一个待发布归档，通过 server.js 启动，使用 tests/compose.yaml 的隔离数据库与 Redis 检查匿名内容、SSR、JS/CSS、RSS、订阅、API 就绪和 Prisma CLI。Playwright 使用官方 standalone server，浏览器测试仍在 CI 安装开发工具。

正式合并后自动发布，仍须查看整条发布流水线，以及登录、上传、发布/隐藏等真实业务验收。归档错误和准备失败不切换；切换后健康失败恢复上一版。应用回退不回滚数据库迁移。

## SSH 超时和版本保留

服务器为 2 核 CPU、2GB 内存。2026-11-18 run 44329654678 停在目录准备的 SSH 动作，日志只有 CLI 版本，未出现远端命令输出；备份、迁移和上传尚未进入。人工停止了该次挂起任务。旧 SSH 工具的命令超时在连接、创建会话和启动命令之后才启动，不能充当完整步骤的截止时间；具体正式服务器连接阻塞点尚未取得详细 SSH 日志。

CI 改用原生 OpenSSH：连接/握手 15 秒、只尝试一次，心跳间隔 15 秒、丢失两次终止；完整连接就绪探测最多 40 秒。远端执行和本地等待都用 GNU timeout，并给 Actions 每个步骤与整个 job 加最终上限。失败返回非零状态，在日志与任务摘要中标明 SSH_FAILED、TIMEOUT 或 DEPLOY_FAILED；不自动重试迁移等写操作。目录准备 120 秒、运行包准备 360 秒、备份 900 秒、迁移/切换/清理 600 秒。超时后写操作可能已经部分执行，重跑前检查迁移历史与实际 current。

远端监督 shell 位于 timeout 终止的进程组之外。备份正文进程收到 TERM 或强制 KILL 后，监督层仅删除本次私有 state 的 dump-client.cnf / dump-ca.pem，保留 SQL 备份和回执；不依赖被终止 Node 的 finally。该机制不保证整台宿主关机或监督层自身被强制杀死时的清理，发生这类故障需核对私有 state。

目录准备只修改部署根、releases 根和本次 release 三个目录的所有者，不递归扫描历史版本或上传文件。真实约 134 MiB 包在 2 核、256 MiB 内存上限的隔离容器中完成三次校验/目录检查及解压约 5.4 秒，进程峰值 RSS 约 54 MiB；该结果仅衡量包处理，不能代替正式服务器整机负载测量。

按用户确认，健康检查通过并提交 current 后，托管 releases/ 只保留当前及上一个成功版本，旧失败批次也可清理。逐个校验绝对路径、名称及符号链接后删除旧目录；失败的候选不能触发清理。初次 standalone 切换保留根目录旧安装用于回退；当另一个成功的 standalone 版本可回退，且 PM2 应用与 PM2 工具没有引用旧运行目录时，只清理已记录的旧 node_modules/.next。保留非托管目录、外部上传、服务器环境/根 public 内容和私有数据库备份。清理失败会使任务报错，并明确新应用已提交；不会撤销已经成功的迁移或切换。
