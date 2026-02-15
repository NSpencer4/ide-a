# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDE-A is a WebContainer-first, Cloudflare-based web IDE. The control plane runs on Cloudflare Workers; code execution
happens entirely in the browser via WebContainers. Workers must NOT run user code.

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

### Phases (from README)

- **Phase 1:** WebContainer-only (current)
- **Phase 2:** Hybrid execution
- **Phase 3:** Collaboration features
