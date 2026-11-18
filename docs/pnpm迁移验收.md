# pnpm 迁移与验收

日期：2026-11-18。前台基线 ac67d79，后台基线 a43c415。用户确认前后台统一 pnpm；本次只提交与评审，不执行生产部署或数据库迁移。

## 变更目的

前台同时保留 npm/pnpm 锁文件，工作流只指定 pnpm 大版本，服务器的 pnpm 版本与构建脚本配置未随发布同步。后台只有未接入流水线的 pnpm 文件，其依赖版本相对 npm 锁文件发生升级。补齐迁移，保证干净安装、CI 与部署使用同一套约定。

## 影响范围

- 两仓各自使用 `packageManager: pnpm@12.3.4` 和独立的 pnpm 锁文件，删除 npm 锁文件。CI 与部署先设置 Node 24，再安装精确 pnpm 版本；npm 仅用于安装 pnpm 工具。
- `pmOnFail: error` 拒绝版本不符；pnpm 12 所需的工具版本记录已写入锁文件，冻结安装可复现。旧 pnpm 9 不再是这版锁文件的兼容目标。
- 依赖生命周期脚本使用 `allowBuilds` 明确批准/拒绝。前台 Prisma 显式 generate，生产安装继续 ignore-scripts；预编译原生依赖通过隔离检查，不开放全部依赖脚本。
- 后台从原 npm 锁文件重新导入，42 项直接依赖解析版本保持一致；测试直接使用的 history 明确声明为开发依赖。`nodeLinker: hoisted` 保持 Umi 所需的扁平依赖布局，postinstall 运行 max setup。包脚本、Git hooks、CI、部署和 README 全部适配。
- 前台发布上传 pnpm-workspace.yaml；服务器先检查 Node 24，在用户独立目录安装 pnpm 12.3.4，校验版本后更新应用。不修改服务器全局 pnpm 或全局 registry，任一步失败即终止，不继续报告发布成功。
- PM2 使用随发布上传的 ecosystem.config.cjs，明确启动 pnpm 12 原生入口与 start 参数；旧入口不一致时仅重建 my-blog，一致时重载，首次部署也可启动。后台 coverage/update 脚本按 pnpm 12 语义直接传递 Jest 参数。

## 验证结果

实施会话本机 Node 22.23.3 / pnpm 12.3.4；Node 24 / Linux 由提交后的 CI 验证。安装与构建使用无旧 node_modules、无 .env 的隔离源码副本；数据库只使用 tests/compose.yaml 对应 blog_test，演示库与正式库未用于测试。

| 检查 | 结果 |
| --- | --- |
| 前台冻结安装 | 干净完整安装及生产依赖安装通过；原业务依赖锁记录未变，仅新增 pnpm 工具版本记录 |
| 前台自动化 | Vitest 35 项、typecheck、lint、生产构建通过 |
| 生产依赖 | ignore-scripts 安装后显式 Prisma generate 通过；隔离库只读查询及 Next 所用 sharp 图片编码通过 |
| 后台冻结安装 | 干净安装通过；max setup 自动生成类型；安装前后锁文件和批准配置一致 |
| 后台自动化/构建 | 干净安装后 Jest 18 项、tsc、生产构建通过 |
| 配对浏览器 | Playwright 18 项通过，含后台登录/CRUD/发布、详情失败禁保存及公开站、订阅回归 |
| 工作流静态检查 | 四份 YAML 解析及前台远程部署脚本 bash -n 通过 |
| PM2 隔离检查 | Docker Node 24 / Linux、pnpm 12.3.4、PM2 7.1.2：旧入口替换、重复重载、首次启动三场景通过；原生入口及子进程 Node 24 均核对 |
| 后台脚本参数 | showConfig 确认 coverage 脚本 collectCoverage=true，update 脚本 updateSnapshot=all，未实际改写快照 |
| 独立评审/CI | 复用原只读评审会话：脚本参数和旧 PM2 入口两项 P2 已修复并源码复核通过；提交后 Node 24 CI 以配对 PR checks 为准 |
| 生产检查 | 未执行服务器 Node/镜像下载/PM2/实际发布；正式审计仍按用户决定留到发布前 |

## 风险与回滚

服务器必须先准备 Node 24；不符合时在应用文件更新前失败。首次替换旧 PM2 启动入口会短暂重启；后续使用明确配置重载。真实服务器 PM2 版本与发布健康检查仍需发布前核实。后台沿用原 Umi/React 18 技术栈，导入时已有 peer 告警不等于新增版本升级；不顺带升级框架。不要在运行中的开发进程上混用 npm 安装、pnpm 安装或构建。

迁移回滚需配对恢复包管理配置、锁文件、工作流和部署工具版本，重新安装依赖及生成 Prisma/.umi；不能只换锁文件或复用不匹配的 node_modules。业务 URL、发布状态和数据库结构没有改动，安全鉴权不可回退。两仓作为独立 PR，保留原系列管理 PR 的发布依赖。
