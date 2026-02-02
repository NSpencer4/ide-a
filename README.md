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
# StackBlitz-Style Web IDE (WebContainer-First)

## Purpose

This repository contains a **WebContainer-first, Cloudflare-based web IDE** inspired by StackBlitz. The goal is to enable users to edit code in the browser and see a live preview with minimal infrastructure, while intentionally designing clean seams for future evolution to remote execution (e.g., Kubernetes).

This README is written **for AI agents and contributors** to align on intent, constraints, and architecture.

---

## High-Level Goals

* **Instant developer experience**: Edit code and see live previews with near-zero startup time.
* **Browser-based execution**: All user code execution runs in the browser via WebContainers (Phase 1).
* **Edge-native control plane**: Use Cloudflare Workers and Durable Objects for coordination, not computation.
* **Event-driven architecture**: Deterministic file mutations with downstream fan-out via SSE.
* **Future-proof design**: Clean abstractions that allow swapping WebContainers for remote runtimes later.

---

## Non-Goals (Phase 1)

The following are explicitly **out of scope** for the initial version:

* Server-side rendering of previews
* Remote code execution (VMs, containers, Kubernetes)
* Long-running background jobs
* Monorepo-scale workspaces
* Native dependency support beyond WebContainer capabilities

These may be addressed in a future phase.

---

## Architectural Principles

1. **Cloudflare orchestrates; browsers execute**

   * Workers and Durable Objects manage state and events.
   * Browsers (WebContainers) run Node, npm, and dev servers.

2. **Mutations are HTTP, not sockets**

   * All filesystem changes are explicit, authenticated HTTP mutations.
   * This provides auditability, ordering, and clear CQRS boundaries.

3. **Events stream state, not UI**

   * Server-Sent Events (SSE) stream filesystem deltas, logs, and status.
   * UI rendering and previews are never streamed from the server.

4. **Durable Objects coordinate, they are not filesystems**

   * DOs store metadata, ordering, and session state.
   * File contents live in R2 or are streamed as deltas.

---

## System Overview

### Control Plane (Cloudflare)

**Cloudflare Worker (API Gateway)**

* Authentication and authorization
* Workspace routing
* Filesystem mutation validation
* SSE endpoint for event fan-out

**Durable Object (Workspace Coordinator)**

* One DO per workspace
* Stores:

  * File tree metadata
  * Version counters
  * Operation log (append-only)
  * Connected client sessions
* Responsible for:

  * Ordering mutations
  * Broadcasting events

**Storage**

* **R2**: Canonical storage for file blobs
* **DO storage**: Metadata and small operation records only

---

### Execution Plane (Browser)

**Editor UI**

* Monaco or CodeMirror
* Optimistic local edits

**WebContainer Runtime**

* Browser-based Node.js (WASM)
* Virtual filesystem
* npm / pnpm installs
* Dev server (e.g., Vite)

**Preview**

* iframe pointing to WebContainer-served localhost port
* Updated via HMR and rebuilds

---

## Canonical Data Flow

### File Edit → Live Preview

1. User edits a file in the editor
2. Client sends an HTTP mutation:

   ```json
   { "op": "write", "path": "/src/App.tsx", "content": "..." }
   ```
3. Worker validates and forwards to the workspace Durable Object
4. DO:

   * Increments version
   * Persists metadata
   * Writes blob to R2
   * Broadcasts an event
5. Clients receive the event via SSE
6. Browser applies the filesystem delta to the WebContainer
7. Dev server rebuilds and updates the preview iframe automatically

At no point does the server render UI or execute user code.

---

## Execution Runtime Abstraction

To enable future evolution, all execution is accessed via an interface:

```ts
interface ExecutionRuntime {
  applyFsDelta(delta: FsDelta): Promise<void>;
  startDevServer(): Promise<PreviewHandle>;
  stop(): Promise<void>;
}
```

### Phase 1 Implementation

* `WebContainerRuntime`

### Future Implementations (Not Yet Built)

* `RemoteContainerRuntime`
* `FirecrackerRuntime`
* `KubernetesRuntime`

The control plane must remain agnostic to the runtime implementation.

---

## Scaling Considerations (Phase 1)

WebContainers have inherent limits. To extend their usefulness:

* Lazy dependency installation
* Deferred dev server startup
* IndexedDB persistence for filesystem caching
* Soft workspace size and file-count limits

When these mitigations are insufficient, the project will transition to remote execution.

---

## Phase Roadmap

### Phase 1 — WebContainer-Only (Current)

* Single-user workspaces
* Browser-only execution
* Cloudflare-based control plane

### Phase 2 — Hybrid Execution (Future)

* Remote runtimes for large projects
* WebContainer fallback for small projects
* Unified control plane

### Phase 3 — Full Collaboration (Future)

* Multi-user editing
* Presence and awareness
* Conflict resolution (CRDT or OT)

---

## Guiding Constraint (Important)

**If a design requires Cloudflare Workers to run user code, build assets, or render previews, it is invalid for this project.**

Execution must happen either:

* In the browser (Phase 1), or
* In real servers/containers (Phase 2+)

---

## Summary

This project intentionally starts simple:

* WebContainers for execution
* Cloudflare for coordination
* SSE for event propagation

The objective is correctness, clarity, and learning — not premature scale.

AI agents and contributors should optimize for:

* Clear separation of concerns
* Deterministic state transitions
* Minimal infrastructure assumptions

Future complexity will be introduced deliberately, once the system’s real bottlenecks are understood.
