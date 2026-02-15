<pre>
IIIIIIIIIIDDDDDDDDDDDDD      EEEEEEEEEEEEEEEEEEEEEE                                AAA
I::::::::ID::::::::::::DDD   E::::::::::::::::::::E                               A:::A
I::::::::ID:::::::::::::::DD E::::::::::::::::::::E                              A:::::A
II::::::IIDDD:::::DDDDD:::::DEE::::::EEEEEEEEE::::E                             A:::::::A
  I::::I    D:::::D    D:::::D E:::::E       EEEEEE                            A:::::::::A
  I::::I    D:::::D     D:::::DE:::::E                                        A:::::A:::::A
  I::::I    D:::::D     D:::::DE::::::EEEEEEEEEE                             A:::::A A:::::A
  I::::I    D:::::D     D:::::DE:::::::::::::::E    ---------------         A:::::A   A:::::A
  I::::I    D:::::D     D:::::DE:::::::::::::::E    -:::::::::::::-        A:::::A     A:::::A
  I::::I    D:::::D     D:::::DE::::::EEEEEEEEEE    ---------------       A:::::AAAAAAAAA:::::A
  I::::I    D:::::D     D:::::DE:::::E                                   A:::::::::::::::::::::A
  I::::I    D:::::D    D:::::D E:::::E       EEEEEE                     A:::::AAAAAAAAAAAAA:::::A
II::::::IIDDD:::::DDDDD:::::DEE::::::EEEEEEEE:::::E                    A:::::A             A:::::A
I::::::::ID:::::::::::::::DD E::::::::::::::::::::E                   A:::::A               A:::::A
I::::::::ID::::::::::::DDD   E::::::::::::::::::::E                  A:::::A                 A:::::A
IIIIIIIIIIDDDDDDDDDDDDD      EEEEEEEEEEEEEEEEEEEEEE                 AAAAAAA                   AAAAAAA
</pre>

# IDE-A — WebContainer-First, Cloudflare-Native Web IDE

A browser-based IDE where code execution runs entirely in-browser via WebContainers, with a Cloudflare control plane for
coordination, persistence, and real-time collaboration.

---

## Goals

- **Instant developer experience** — edit code and see live previews with near-zero startup time
- **Local-first UX** — edits apply to a local CRDT replica instantly; network is async
- **Browser-based execution** — all user code runs in WebContainers (Phase 1)
- **Edge-native control plane** — Cloudflare Workers + Durable Objects for coordination, never computation
- **Real-time collaboration** — multi-user editing with presence via CRDT + WebSockets
- **Sub-100ms perceived interactions** for typical edits

## Non-Goals (Phase 1)

- Server-side rendering of previews
- Remote code execution (VMs, containers, Kubernetes)
- AI agent orchestration
- One-click deploy integrations (Netlify/Supabase/etc.)

---

## Architecture Overview

```
 Browser                    Cloudflare Edge                  Storage
┌──────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Editor (CM6)    │     │  Worker           │     │  D1 (metadata)     │
│  CRDT Replica    │◄───►│  Auth + Routing   │◄───►│  Users, projects,  │
│  WebContainer    │ WS  │                   │     │  membership, ptrs  │
│  Preview iframe  │     │  ┌──────────────┐ │     ├────────────────────┤
│                  │     │  │ Project DO   │ │     │  R2 (blobs)        │
│                  │     │  │ CRDT State   │─┼────►│  Snapshots, assets │
│                  │     │  │ Presence     │ │     │  Patch logs        │
│                  │     │  │ Sequencing   │ │     └────────────────────┘
│                  │     │  └──────────────┘ │
└──────────────────┘     └──────────────────┘
```

### Data Flow: Real-Time Edit

1. User types in the editor
2. Change applies to **local CRDT** instantly (optimistic)
3. Derived file written to **WebContainer FS** — HMR updates preview
4. CRDT patch sent async over **WebSocket** to Worker → Project DO
5. DO applies patch, increments sequence, **broadcasts** to all peers
6. Remote browsers merge patch into their CRDT → update FS → HMR

**No D1 or R2 operations on the real-time hot path.** Persistence is async.

### Components

| Component      | Role                                  | Tech                                              |
|----------------|---------------------------------------|---------------------------------------------------|
| **Browser**    | Execution + local-first editing       | WebContainers, CRDT (Yjs/Automerge), CodeMirror 6 |
| **Worker**     | Auth, routing, rate limiting          | Cloudflare Workers, JWT/session auth              |
| **Project DO** | CRDT authority, sequencing, broadcast | Durable Objects, WebSockets, alarm scheduling     |
| **D1**         | Relational metadata + pointers        | Users, projects, membership, snapshot pointers    |
| **R2**         | Immutable blob storage                | CRDT snapshots, patch logs, binary assets         |

### Key Constraints

- **Workers must NEVER run user code, build assets, or render previews**
- **No D1/R2 calls on the real-time hot path** — only DO memory
- **R2 writes before D1 pointer updates** (avoid dangling pointers)
- **Snapshots are immutable** — update pointers in D1, don't overwrite R2 blobs

---

## Tech Stack

- **React 19** + **React Router 7** with React Server Components (RSC)
- **Vite 7** with `@vitejs/plugin-rsc` and `@cloudflare/vite-plugin`
- **Cloudflare Workers** with `nodejs_compat`
- **Tailwind CSS 4**
- **CodeMirror 6** for the editor
- **@webcontainer/api** for in-browser code execution
- **pnpm** as the package manager

---

## Getting Started

```bash
pnpm install
pnpm dev
```

| Command          | Description                                 |
|------------------|---------------------------------------------|
| `pnpm dev`       | Start local dev server                      |
| `pnpm build`     | Production build                            |
| `pnpm deploy`    | Build + deploy via Wrangler                 |
| `pnpm typecheck` | Run cf-typegen + react-router typegen + tsc |
| `pnpm preview`   | Build + Vite preview                        |

---

## Phase Roadmap

### Phase 1 — WebContainer-Only (Current)

- Single-user workspaces
- Browser-only execution via WebContainers
- Cloudflare Workers + Durable Objects for persistence
- CodeMirror editor with live preview

### Phase 2 — Real-Time Collaboration

- CRDT-based multi-user editing (Yjs or Automerge)
- WebSocket protocol: `hello`, `presence`, `patch`, `sync`, `error`
- Presence awareness (cursors, selections)
- Async snapshot persistence (DO → R2 → D1 pointers)

### Phase 3 — Hybrid Execution

- Remote runtimes for large projects
- WebContainer fallback for small projects
- Unified control plane across execution backends

---

## Documentation

- **[Architecture](docs/architecture.md)** — full system design, schemas, access patterns, operational policies
- **[Architecture Source](docs/arch.json)** — machine-readable architecture specification

---

## Guiding Principle

> If a design requires Cloudflare Workers to run user code, it is invalid for this project.
> Execution happens in the browser (Phase 1) or in real servers/containers (Phase 3).
