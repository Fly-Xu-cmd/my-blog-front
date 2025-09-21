# 若木的小世界 - 博客项目

这是一个基于 [Next.js](https://nextjs.org) 构建的个人博客项目，使用 React 19 和 Tailwind CSS 4 开发，采用现代化的时间轴样式展示博客文章。

## 项目特点

- 基于 Next.js 15.5.3 和 React 19.1.0 构建
- 使用 Tailwind CSS 4 实现响应式设计和精美 UI
- 采用时间轴样式展示博客文章，提供清晰的阅读体验
- 自定义导航栏，包含品牌标识和联系信息
- 支持二维码展示功能
- 优化的文件结构，便于维护和扩展

## 快速开始

首先，确保已安装 Node.js 环境，然后执行以下命令运行开发服务器：

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 在浏览器中查看效果。您可以通过修改 `app/page.tsx` 来编辑首页内容，页面会在您编辑后自动更新。

## 项目结构

```
├── app/                # 应用主目录
│   ├── globals.css     # 全局样式
│   ├── layout.tsx      # 页面布局
│   ├── page.tsx        # 博客首页
│   ├── posts/          # 文章详情页
│   └── icon/           # 图标字体
├── composes/           # 可复用组件
│   ├── Contact.tsx     # 联系信息组件
│   └── Header.tsx      # 顶部导航栏组件
├── data/               # 数据文件
│   └── posts.js        # 博客文章数据
├── public/             # 静态资源
│   └── imgs/           # 图片资源（如二维码）
├── tailwind.config.js  # Tailwind CSS 配置
└── package.json        # 项目依赖
```

## 核心功能

### 时间轴博客展示

博客首页采用优雅的时间轴样式展示文章列表，文章按日期倒序排列，最新文章显示在顶部。每个时间点都有蓝色圆形标记，增强视觉层次感。

### 导航栏设计

顶部导航栏使用固定定位，在页面滚动时保持可见。导航栏包含品牌名称"若木的小世界"和联系信息入口。

### 联系信息组件

联系组件提供微信、QQ 和 GitHub 等联系方式的图标链接，点击微信图标可显示二维码。

## 开发指南

### 添加新文章

在 `data/posts.js` 文件中添加新的文章对象，包含以下字段：

- `id`: 唯一标识符
- `title`: 文章标题
- `excerpt`: 文章摘要
- `content`: 文章内容
- `date`: 发布日期

### 自定义样式

可以在 `app/globals.css` 中添加全局样式，或使用 Tailwind CSS 类直接在组件中应用样式。

## 部署指南

最简单的部署方式是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)，Next.js 的创建者提供的平台。

详细的部署文档请参考 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying)。

## 技术栈

- **前端框架**: Next.js 15.5.3
- **UI 框架**: React 19.1.0
- **样式系统**: Tailwind CSS 4
- **编程语言**: TypeScript
- **构建工具**: Turbopack (Next.js 内置)

## 许可证

MIT
