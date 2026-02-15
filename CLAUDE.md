# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDE-A is a **WebContainer-first, Cloudflare-native web IDE** with real-time collaboration. Code execution happens
entirely in the browser via WebContainers. The control plane (Workers, Durable Objects, D1, R2) handles coordination,
persistence, and collaboration — it must **never** run user code.

### Core Principles

- **Local-first UX**: Edits apply to the local CRDT instantly; network is async
- **CRDT collaboration**: Yjs or Automerge for deterministic convergence across users
- **No D1/R2 on the hot path**: Real-time edits flow through DO memory only; persistence is async
- **WebContainers as a render target**: The virtual FS is derived from CRDT state, not the source of truth
- **Sub-100ms perceived interactions** for typical edits

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Deploy:** `pnpm deploy` (builds then deploys via Wrangler)
- **Type check:** `pnpm typecheck` (runs cf-typegen, react-router typegen, then tsc)
- **Preview:** `pnpm preview` (builds then serves via Vite preview)

No test runner or linter is configured yet.

## Architecture

- **React 19 + React Router 7** with **React Server Components (RSC)** — not traditional SSR
- **Vite 7** with `@vitejs/plugin-rsc`, `@cloudflare/vite-plugin`, and `unstable_reactRouterRSC`
- **Cloudflare Workers** as the deployment target with `nodejs_compat`
- **Tailwind CSS 4** via Vite plugin
- **pnpm** as the package manager

### RSC Setup

The worker entry is React Router's default RSC entry (`@react-router/dev/config/default-rsc-entries/entry.rsc`),
configured in `wrangler.jsonc`. No custom `workers/app.ts` handler is needed for RSC mode.

Vite configures three environments: `rsc` (parent, runs on Cloudflare), `ssr` (child of rsc), and `client`. The
Cloudflare plugin targets the `rsc` environment with `childEnvironments: ["ssr"]`.

Components are server components by default. Client components require the `"use client"` directive.

### Routing

Routes are defined in `app/routes.ts` using React Router 7's config-based routing. The root layout is `app/root.tsx`.

### TypeScript

Project references split config into `tsconfig.node.json` (Vite config) and `tsconfig.cloudflare.json` (app + workers).
Path alias `~/*` maps to `./app/*`.

## System Components

### Browser Runtime

- **WebContainers** for in-browser Node.js execution (dev server, bundler, HMR)
- **CRDT library** (Yjs/Automerge) maintains local replica — this is the source of truth for UX
- **WebSocket client** sends/receives patches to/from the Project DO
- File contents are **derived from CRDT state** and written into the WebContainer virtual FS

### Cloudflare Worker (Edge Front Door)

- Authenticates requests (session/JWT)
- Authorizes project access via D1 membership lookup (cached)
- Routes WebSocket connections to the correct Project DO by `project_id`
- Exposes REST endpoints for metadata (create/list projects, invites, etc.)
- **Must not call D1 on every edit** — only at connection establishment / session refresh

### Project Durable Object (one per project)

- Single authority for sequencing + broadcasting CRDT patches
- Holds active CRDT document state **in memory**
- Manages presence (cursors, selections, connected users)
- **Hot path** (patch apply + broadcast): no D1 or R2 — must stay under 20ms
- **Persistence path** (async): serialize CRDT snapshot to R2, then update D1 pointer
- **Recovery path**: D1 pointer → R2 snapshot → deserialize → resume

### Data Stores

| Store         | Contents                                                           | Hot Path?            |
|---------------|--------------------------------------------------------------------|----------------------|
| **DO Memory** | Active CRDT state, presence, sequence counters                     | Yes                  |
| **R2**        | CRDT snapshots (immutable), patch logs, binary assets              | No (async writes)    |
| **D1**        | Users, projects, membership/roles, snapshot pointers, audit events | No (connect + async) |
| **Browser**   | Local CRDT replica, derived WebContainer FS, preview state         | Yes (local)          |

### Key Access Patterns

- **Real-time edit**: Browser → CRDT → WebSocket → Worker → DO (apply + broadcast) → Browsers. No D1/R2.
- **Connect/join**: Browser → Worker (auth + D1 membership check) → DO (attach WebSocket)
- **Snapshot persist**: DO → R2.put(snapshot) → D1.insert(row) → D1.update(pointer). **R2 first, then D1.**
- **DO recovery**: D1 read pointer → R2.get(snapshot) → deserialize → resume serving

### WebSocket Protocol

Message types: `hello`, `presence`, `patch`, `sync`, `error`. DO assigns `seq` for broadcast ordering;
CRDT ensures convergence regardless of delivery order.

## Key Constraints

- **Workers must NEVER run user code, build assets, or render previews**
- **No D1/R2 calls on the real-time hot path** — only DO memory
- **R2 writes before D1 pointer updates** (avoid dangling pointers)
- **Snapshots are immutable** — update pointers in D1, don't overwrite R2 blobs
- **Max patch size**: 64KB. **Max message size**: 1MB. **Max connections per project**: 200.

## Phases

- **Phase 1:** WebContainer-only, single-user (current)
- **Phase 2:** Real-time collaboration via CRDT + WebSockets
- **Phase 3:** Hybrid execution (remote runtimes for large projects)

See `docs/architecture.md` for full schema definitions, R2 object layout, operational policies, and failure handling.
