# IDE-A System Architecture

> Source of truth: [`docs/arch.json`](./arch.json)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Details](#component-details)
3. [Data Flow & Access Patterns](#data-flow--access-patterns)
4. [Data Stores & What Goes Where](#data-stores--what-goes-where)
5. [D1 Schemas](#d1-schemas)
6. [R2 Object Layout](#r2-object-layout)
7. [WebSocket Protocol](#websocket-protocol)
8. [Operational Policies](#operational-policies)
9. [Security](#security)
10. [Failure Modes & Recovery](#failure-modes--recovery)

---

## System Overview

IDE-A is a **local-first, WebContainer-based web IDE** with a Cloudflare control plane. The architecture separates
concerns into four layers:

```
 Browser (execution)          Edge (coordination)           Storage (persistence)
┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────────────┐
│ Editor (CodeMirror)  │    │ Cloudflare Worker    │    │ D1                       │
│ Local CRDT replica   │◄──►│ Auth, routing, rate  │◄──►│ Users, projects, members │
│ WebContainer runtime │ WS │ limiting             │    │ Snapshot pointers        │
│ Preview iframe       │    │                      │    │ Audit events             │
│                      │    │ ┌──────────────────┐ │    ├──────────────────────────┤
│                      │    │ │ Project DO       │ │    │ R2                       │
│                      │    │ │ (one per project)│─┼───►│ CRDT snapshots           │
│                      │    │ │ CRDT authority   │ │    │ Patch logs               │
│                      │    │ │ Presence + seq   │ │    │ Binary assets            │
│                      │    │ └──────────────────┘ │    └──────────────────────────┘
└─────────────────────┘    └─────────────────────┘
```

### Design Goals

| Goal                                            | Target                          |
|-------------------------------------------------|---------------------------------|
| Local-first UX with optimistic edits            | < 20ms perceived latency        |
| Sub-100ms perceived interactions                | Typical edit round-trip         |
| Durable persistence with deterministic recovery | Snapshot + pointer model        |
| Scale to ~1M active users with launch spikes    | Stateless Workers + sharded DOs |
| No D1/R2 calls on the real-time hot path        | DO memory only                  |

### Non-Goals

- Perfect global ordering beyond CRDT semantics
- Storing file blobs in SQL
- Synchronous persistence acknowledgements for typing

---

## Component Details

### Browser Runtime

**Tech:** WebContainers, CRDT library (Yjs/Automerge), WebSocket client, CodeMirror 6

**Responsibilities:**

- Run full-stack app locally (dev server, bundler, HMR) within WebContainers
- Maintain local CRDT replica and apply local edits instantly
- Derive file contents from CRDT and write them into WebContainer filesystem
- Receive remote patches and merge deterministically
- Trigger preview updates via HMR (decoupled from persistence ack)

**Local Stores:**

| Store                   | Type       | Durability | Notes                                            |
|-------------------------|------------|------------|--------------------------------------------------|
| Local CRDT replica      | In-memory  | Ephemeral  | Authoritative for local UX; converges via merges |
| WebContainer filesystem | Virtual FS | Ephemeral  | Derived from CRDT; treated as a render target    |

### Cloudflare Worker (Edge Front Door)

**Tech:** Cloudflare Workers, WebSockets, Durable Object stubs, JWT/session auth

**Responsibilities:**

- Authenticate requests (session/JWT)
- Authorize project access (D1 membership lookup + caching)
- Route WebSocket connections to correct Project DO by `project_id`
- Rate limit and protect DO from abuse (per user/project)
- Expose REST endpoints for metadata (create/list projects, invites)
- Observability injection (request IDs, metrics, logs)

**Hot Path Rules:**

- Worker must **not** call D1 on every edit — only at connection establishment / session refresh
- WebSocket upgrade must validate auth + membership **before** attaching to DO

### Project Durable Object

**Identity key:** `project_id` (one DO instance per project)

**Tech:** Cloudflare Durable Objects, WebSockets, `alarm()` scheduling, R2 binding, D1 binding

**Responsibilities:**

- Single authority per project for sequencing + broadcasting patches
- Hold active CRDT document state in memory
- Maintain presence and session metadata
- Persist snapshots/patch logs to R2 asynchronously
- Maintain durable pointers/metadata in D1
- Rehydrate from storage on cold start

**In-Memory State:**

| Field           | Description                                                |
|-----------------|------------------------------------------------------------|
| `crdt_state`    | CRDT document instance or serialized state                 |
| `presence`      | `Map<connectionId, {userId, cursor, selection, lastSeen}>` |
| `seq`           | Monotonic sequence for broadcast ordering                  |
| `last_snapshot` | Timestamp (ms) of last snapshot                            |
| `dirty`         | Boolean or patch counter since last snapshot               |
| `connections`   | Set of active WebSocket connections                        |

---

## Data Flow & Access Patterns

### 1. Real-Time Edit (Hot Path)

**Path:** Browser → WebSocket → Worker → Project DO → broadcast → Browsers

**D1 involved:** No | **R2 involved:** No

**Latency target:** 20ms (DO apply + broadcast)

```
User types         Local CRDT      WebContainer FS     WebSocket        Project DO         Peers
   │                  │                  │                 │                 │                │
   ├─ keystroke ─────►│                  │                 │                 │                │
   │                  ├─ derive file ───►│                 │                 │                │
   │                  │                  ├─ HMR ──► preview│                 │                │
   │                  ├─ patch ─────────────────────────────►                │                │
   │                  │                  │                 │  ├─ validate    │                │
   │                  │                  │                 │  ├─ apply CRDT  │                │
   │                  │                  │                 │  ├─ seq++       │                │
   │                  │                  │                 │  ├─ mark dirty  │                │
   │                  │                  │                 │  ├─ broadcast ──────────────────►│
   │                  │                  │                 │  └─ schedule persist (alarm)     │
```

**DO Hot Path Steps:**

1. Validate patch shape and size limits
2. Apply patch to in-memory CRDT
3. Increment `seq`
4. Broadcast patch to all peers (including `seq` + `actor`)
5. Mark `dirty` / increment patch count
6. Schedule persistence (alarm or queued job)

### 2. Connect & Join Session

**Path:** Browser → Worker (auth + membership) → DO (attach WebSocket)

**Latency target:** 100ms

| Step | Action                                                   |
|------|----------------------------------------------------------|
| 1    | Validate auth token/cookie                               |
| 2    | Check membership/role for `project_id` (D1 read + cache) |
| 3    | Open DO stub for `project_id`                            |
| 4    | Upgrade and attach WebSocket to DO                       |

### 3. Snapshot Persistence (Async)

**Path:** DO → R2.put(snapshot) → D1.insert(snapshot row) → D1.update(pointer)

**Write order invariant:** R2 first, then D1 (avoid dangling pointers)

| Step | Action                                                     |
|------|------------------------------------------------------------|
| 1    | Serialize CRDT to snapshot blob                            |
| 2    | Compute `versionId` (UUIDv7 or timestamp+random)           |
| 3    | `R2.put(snapshotKey, blob, metadata)`                      |
| 4    | D1: insert `project_snapshots` row (append-only history)   |
| 5    | D1: update `project_state.latest_snapshot_id` + timestamps |

**Triggers:**

- Every N patches (500–2000 depending on size)
- Every T seconds (15–60s) while active
- When last client disconnects (flush)

**Async Rules:**

- Never block patch apply
- Retry D1 pointer updates idempotently if R2 write succeeded
- Handle orphaned blobs via periodic compaction/reconciliation

### 4. DO Recovery (Cold Start)

**Path:** D1 read pointer → R2.get(snapshot) → deserialize → resume

**Latency target:** 200ms

| Step | Action                                                           |
|------|------------------------------------------------------------------|
| 1    | Read `project_state` for `project_id` → get `latest_snapshot_id` |
| 2    | Join to `project_snapshots` → get `r2_key`                       |
| 3    | Fetch snapshot blob from R2                                      |
| 4    | Deserialize CRDT state into memory                               |
| 5    | Optionally replay patch log                                      |
| 6    | Accept connections and resume real-time                          |

### 5. Metadata API (REST)

**Path:** Browser → Worker REST → D1 read/write → response

**Latency target:** 200ms

Examples: rename project, change visibility, add/remove member.

### 6. Asset Upload

**Path:** Browser → Worker (signed upload or proxied) → R2.put(asset by hash) → D1 optional reference row

Prefer direct-to-R2 signed uploads for large files; Worker issues signed URL after auth.

---

## Data Stores & What Goes Where

| Store         | Contents                                                                                                                             |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------|
| **DO Memory** | Active CRDT state, presence + session metadata, sequencing counters, short-lived locks                                               |
| **R2**        | CRDT snapshots (immutable), patch log chunks (immutable), binary assets (content-addressed), exports                                 |
| **D1**        | Users, projects, permissions (membership roles), snapshot pointers + patch offsets, snapshot history, audit events, project settings |
| **Browser**   | Local CRDT replica, derived WebContainer filesystem, preview runtime state                                                           |

---

## D1 Schemas

### `users`

```sql
CREATE TABLE users
(
    id         TEXT PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    name       TEXT,
    avatar_url TEXT,
    created_at INTEGER     NOT NULL,
    updated_at INTEGER     NOT NULL
);
CREATE INDEX idx_users_email ON users (email);
```

### `projects`

```sql
CREATE TABLE projects
(
    id          TEXT PRIMARY KEY,
    owner_id    TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT,
    visibility  TEXT    NOT NULL, -- 'private'|'public'
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users (id)
);
CREATE INDEX idx_projects_owner ON projects (owner_id);
```

### `project_members`

```sql
CREATE TABLE project_members
(
    project_id TEXT    NOT NULL,
    user_id    TEXT    NOT NULL,
    role       TEXT    NOT NULL, -- 'owner'|'editor'|'viewer'
    created_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
CREATE INDEX idx_project_members_user ON project_members (user_id);
```

### `project_snapshots`

```sql
CREATE TABLE project_snapshots
(
    id          TEXT PRIMARY KEY, -- versionId
    project_id  TEXT    NOT NULL,
    r2_key      TEXT    NOT NULL,
    patch_count INTEGER NOT NULL,
    size_bytes  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    created_by  TEXT,             -- user_id or 'system'
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
CREATE INDEX idx_snapshots_project_time ON project_snapshots (project_id, created_at DESC);
```

### `project_state`

```sql
CREATE TABLE project_state
(
    project_id          TEXT PRIMARY KEY,
    latest_snapshot_id  TEXT,
    latest_patch_offset INTEGER NOT NULL DEFAULT 0,
    last_snapshot_at    INTEGER,
    updated_at          INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

### `project_settings`

```sql
CREATE TABLE project_settings
(
    project_id                    TEXT PRIMARY KEY,
    runtime_mode                  TEXT    NOT NULL DEFAULT 'browser', -- 'browser'|'cloud'
    auto_snapshot_patch_threshold INTEGER NOT NULL DEFAULT 1000,
    auto_snapshot_interval_ms     INTEGER NOT NULL DEFAULT 30000,
    max_asset_bytes               INTEGER NOT NULL DEFAULT 52428800,
    updated_at                    INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

### `audit_events`

```sql
CREATE TABLE audit_events
(
    id         TEXT PRIMARY KEY,
    project_id TEXT    NOT NULL,
    actor_id   TEXT,
    event_type TEXT    NOT NULL,
    metadata   TEXT, -- small JSON only
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);
CREATE INDEX idx_audit_project_time ON audit_events (project_id, created_at DESC);
```

### Hot Queries

| Name                        | SQL                                                                                                                                                   |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Permission check on connect | `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?;`                                                                              |
| DO recovery pointer lookup  | `SELECT ps.latest_snapshot_id, s.r2_key FROM project_state ps LEFT JOIN project_snapshots s ON s.id = ps.latest_snapshot_id WHERE ps.project_id = ?;` |
| List projects for user      | `SELECT p.* FROM projects p JOIN project_members pm ON pm.project_id = p.id WHERE pm.user_id = ? ORDER BY p.updated_at DESC LIMIT ? OFFSET ?;`        |

---

## R2 Object Layout

### Key Prefixes

| Type       | Pattern                                              |
|------------|------------------------------------------------------|
| Snapshots  | `projects/{projectId}/snapshots/{versionId}.bin`     |
| Patch logs | `projects/{projectId}/patches/{fromSeq}-{toSeq}.bin` |
| Assets     | `projects/{projectId}/assets/{sha256}`               |
| Exports    | `projects/{projectId}/exports/{exportId}.tar.gz`     |

### Snapshot Blob Contract

| Field               | Type              | Notes                                  |
|---------------------|-------------------|----------------------------------------|
| `projectId`         | string            |                                        |
| `versionId`         | string            |                                        |
| `createdAt`         | number (epoch ms) |                                        |
| `codecVersion`      | number            | For forward-compatible deserialization |
| `patchCount`        | number            | Patches since previous snapshot        |
| `crdtState`         | opaque            | Serialized CRDT state                  |
| `optionalFileIndex` | map               | `path → {hash, size, mtime}`           |

**Encoding:** Binary preferred (JSON acceptable for v1). Compress with zstd/gzip as blob sizes grow.

### Patch Log Contract (Optional)

| Field       | Type                        |
|-------------|-----------------------------|
| `projectId` | string                      |
| `fromSeq`   | number                      |
| `toSeq`     | number                      |
| `createdAt` | number                      |
| `patches`   | list of opaque CRDT updates |

Chunked into bounded objects (100–1000 patches per object).

### R2 Object Metadata Headers

`projectId`, `versionId`, `createdAt`, `patchCount`, `contentType`, `codecVersion`

### R2 Rules

- R2 never writes to D1 directly — the DO coordinates both
- Prefer content-addressed assets for dedup (`assets/{sha256}`)
- Snapshots are immutable — update pointers in D1, never overwrite blobs

---

## WebSocket Protocol

### Message Types

| Type       | Direction       | Purpose                                          |
|------------|-----------------|--------------------------------------------------|
| `hello`    | client → server | Includes `project_id`, `client_id`, auth context |
| `presence` | bidirectional   | Cursor/selection updates                         |
| `patch`    | bidirectional   | CRDT updates                                     |
| `sync`     | bidirectional   | State vector exchange for catch-up               |
| `error`    | server → client | Permission, rate limit, or size errors           |

**Ordering:** DO assigns `seq` for broadcast ordering. CRDT ensures convergence regardless of delivery order.

---

## Operational Policies

### Snapshot Policy Defaults

| Setting                  | Default        |
|--------------------------|----------------|
| Patch threshold          | 1,000 patches  |
| Time interval            | 30,000ms (30s) |
| Flush on last disconnect | Yes            |

### Snapshot Retention

| Policy                | Value   |
|-----------------------|---------|
| Keep last N snapshots | 50      |
| Keep daily snapshots  | 14 days |
| Keep weekly snapshots | 8 weeks |

### Limits & Quotas

| Limit                                  | Value |
|----------------------------------------|-------|
| Max patch size                         | 64 KB |
| Max message size                       | 1 MB  |
| Max asset size (default)               | 50 MB |
| Max concurrent connections per project | 200   |
| Max projects per user (soft limit)     | 1,000 |

### Observability

**Metrics:** `ws_connections_active`, `patch_apply_latency_ms`, `broadcast_fanout_count`, `snapshot_write_latency_ms`,
`snapshot_failure_count`, `rehydration_latency_ms`, `d1_query_latency_ms`, `r2_get_put_latency_ms`

**Logs:** Connection lifecycle, snapshot start/finish/failure, recovery events, rate limit denials

**Tracing:** Propagate `request_id` from Worker to DO. Attach `project_id` + `user_id` (hashed) for correlation.

---

## Security

### Access Control

- All WebSocket upgrades must pass through Worker for authorization
- DO does not accept unauthenticated inbound traffic except via Worker
- Membership enforced on connect and periodically revalidated (revocation window)
- Role controls (`viewer`/`editor`/`owner`) enforced for patch submission

### Recommended Checks

- Project visibility (public vs private)
- Member role lookup (`project_members`)
- Rate limit by `user_id` + `project_id`

### Data Protection

- Avoid storing secrets in project snapshots; handle env variables separately (future)
- Assets in R2 use signed URLs for private projects
- Audit logs store only small JSON metadata

---

## Failure Modes & Recovery

### DO Crashes Mid-Session

1. Clients reconnect to Worker
2. Worker routes to DO (may be a new instance)
3. DO rehydrates from latest snapshot pointer (D1 → R2)
4. Clients resync via CRDT (send state vector / request missing updates)

### R2 Write Succeeds but D1 Update Fails

1. DO retries D1 insert/update idempotently
2. If still failing, keep latest `versionId` in memory and retry on next alarm
3. Optional reconciliation job scans recent R2 objects vs D1 rows

### D1 Temporarily Unavailable

1. Real-time editing continues unaffected (hot path doesn't use D1)
2. Defer snapshot pointer update until D1 recovers
3. Bound in-memory pending pointer updates to avoid unbounded growth
