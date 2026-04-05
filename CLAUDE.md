# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 personal blog application built with React 18, Tailwind CSS 4, Prisma ORM, and MySQL/MariaDB. The app uses the App Router architecture and supports both blog posts and short "dynamics" (status updates).

## Commands

```bash
pnpm dev              # Start development server with Turbopack
pnpm build            # Production build with Turbopack
pnpm start            # Run production server
pnpm lint             # Run ESLint
pnpm prisma generate  # Generate Prisma client
pnpm prisma migrate deploy  # Deploy database migrations
```

## Architecture

### App Router Structure
- `app/page.tsx` - Root redirect to `/frontend`
- `app/layout.tsx` - Root layout with fonts and global styles
- `app/frontend/` - Main frontend pages (blog, dynamics, about)
- `app/frontend/layout.tsx` - Frontend layout with Header component
- `app/api/` - REST API routes for posts, dynamics, categories, tags, auth, uploads

### Key Directories
- `components/` - Reusable UI components (Header, Contact, NewBlogs, NewStatus, MyEditor)
- `lib/prisma.ts` - Prisma client singleton (prevents multiple instances in dev)
- `data/` - Legacy static data files (posts.js, status.js)
- `prisma/schema.prisma` - Database schema definition

### Database Models (Prisma)
- **Post**: Blog posts with title, slug, excerpt, content, cover, published status, category, and tags
- **Dynamic**: Short status updates with content and excerpt
- **Category**: Post categories (one-to-many with Post)
- **Tag**: Post tags (many-to-many via PostTag)
- **PostTag**: Junction table for Post-Tag relationship

### API Route Patterns
API routes follow REST conventions:
- `GET /api/posts` - List posts (supports filtering by published, category, tags)
- `POST /api/posts` - Create post (auto-generates unique slug from title)
- `GET /api/dynamics` - List dynamics with pagination
- `POST /api/login` - JWT authentication (uses ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET env vars)

### Frontend Structure
- Home page (`/frontend`) displays a 3D cube animation toggling between latest blogs and dynamics
- `/frontend/allBlogs` - Full blog list
- `/frontend/allStatus` - Full dynamics list
- `/frontend/posts/[slug]` - Individual blog post detail
- `/frontend/status/[id]` - Individual dynamic detail

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - MySQL/MariaDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `ADMIN_USERNAME` - Admin username for authentication
- `ADMIN_PASSWORD` - Admin password for authentication
- `NEXT_PUBLIC_BASE_URL` - Public URL for image references

## Deployment

CI/CD via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main` branch:
- Builds on Ubuntu runner with Node.js 20 and pnpm
- Deploys to Aliyun server via rsync + SSH
- Uses PM2 for process management
- Runs Prisma migrations automatically

## Package Manager

This project uses **pnpm**. Always use `pnpm` commands, not npm or yarn.

## Path Alias

`@/*` maps to the root directory (configured in tsconfig.json). Use this for imports:
```typescript
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
```