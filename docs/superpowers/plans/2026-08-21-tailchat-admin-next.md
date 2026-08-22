# Tailchat Admin Next Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete bilingual, independently runnable replacement for the legacy Tailchat Admin under `server/admin-next` without Tushan.

**Architecture:** Copy the legacy Express/Moleculer admin backend into a sibling package with isolated paths, port, and JWT platform. Build the client with React, native History and fetch APIs, Arco Design themed through local CSS tokens, Recharts, a shared resource-table/form layer, and the existing ByteMD editor.

**Tech Stack:** Node.js 18, pnpm 8.15.8, TypeScript 4.9, React 18, Vite 4, Express 4, Arco Design 2.51, Recharts 2.7, native Node test runner, ByteMD.

**Spec:** `docs/superpowers/specs/2026-08-21-tailchat-admin-next-design.md`

## Global Constraints

- Keep `server/admin` unchanged and runnable throughout this work.
- Use `/admin-next/`, `/admin-next/api`, `ADMIN_NEXT_PORT` defaulting to `3100`, JWT platform `admin-next`, and storage key `tailchat:admin-next:auth`.
- Copy the complete legacy backend; do not share runtime backend modules with `server/admin`.
- Do not add Tushan or React Router; keep Arco behind shared controls and Recharts behind chart wrappers.
- Preserve Chinese and English for every user-visible string.
- Use only `tailchat-logo.png` from the Open Design project.
- Do not change root admin scripts, Docker, release packaging, CI routing, deployment, or production traffic.
- Do not commit, push, or create a pull request; the user has not requested delivery actions.

## File map

- `pnpm-workspace.yaml`: add the independent workspace package.
- `server/admin-next/package.json`, `tsconfig*.json`, `vite.config.ts`, `nodemon.json`, `index.html`: package runtime and build configuration.
- `server/admin-next/public/tailchat-logo.svg`: approved PNG bytes embedded in a text SVG container.
- `server/admin-next/src/server/**`: complete copied legacy backend with independent path, port, and token platform.
- `server/admin-next/src/client/core.ts`: tested route, auth, query, nested-value, CSV, and chart helpers.
- `server/admin-next/src/client/core.test.ts`: native Node behavior tests.
- `server/admin-next/src/client/auth.tsx`: login state and protected-session context.
- `server/admin-next/src/client/api.ts`: authenticated fetch and resource operations.
- `server/admin-next/src/client/i18n.tsx`: bilingual dictionary, lookup, persistence, and context.
- `server/admin-next/src/client/icons.tsx`: reusable monoline SVG icons.
- `server/admin-next/src/client/components.tsx`: shell, controls, tables, forms, charts, modal, toast, and state views.
- `server/admin-next/src/client/resources.ts`: resource schemas and field behavior.
- `server/admin-next/src/client/pages/Overview.tsx`: dashboard and analytics.
- `server/admin-next/src/client/pages/Resources.tsx`: generic CRUD pages and user/group/file custom actions.
- `server/admin-next/src/client/pages/Infrastructure.tsx`: network, Socket.IO, and cache.
- `server/admin-next/src/client/pages/System.tsx`: notification editor and system settings.
- `server/admin-next/src/client/App.tsx`, `main.tsx`, `styles.css`, `vite-env.d.ts`: application entry, route composition, and approved responsive visual system.

---

### Task 1: Establish the independent package and copied backend

**Files:**
- Create: `server/admin-next/package.json`
- Create: `server/admin-next/tsconfig.json`
- Create: `server/admin-next/tsconfig.server.json`
- Create: `server/admin-next/vite.config.ts`
- Create: `server/admin-next/nodemon.json`
- Create: `server/admin-next/index.html`
- Create: `server/admin-next/src/server/**`
- Create: `server/admin-next/public/tailchat-logo.svg`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**
- Consumes: existing `server/admin/src/server/**`, server models, discover plugin model, and `tailchat-server-sdk`.
- Produces: a server at `http://localhost:${ADMIN_NEXT_PORT:-3100}/admin-next/` with API prefix `/admin-next/api`.

- [ ] **Step 1: Add package configuration and workspace ownership**

Use the legacy dependency versions but remove `tushan`, `axios`, and `@loadable/component`. Add scripts `dev`, `start`, `test`, `check:type`, `build:client`, `build:server`, and `build`; point production start to `dist/admin-next/src/server/index.js`; set Vite base to `/admin-next/`.

- [ ] **Step 2: Copy the complete backend and isolate runtime constants**

Copy every file below `server/admin/src/server`. Change the Express mount to `/admin-next/api`, port lookup to `ADMIN_NEXT_PORT || 3100`, browser URL to `/admin-next/`, and both JWT sign/verify platform values to `admin-next`. Do not change resource behavior.

- [ ] **Step 3: Verify the copied server compiles**

Run: `pnpm --dir server/admin-next build:server`
Expected: exit 0 and output under `server/admin-next/dist/admin-next/src/server`.

### Task 2: Build and test the client core

**Files:**
- Create: `server/admin-next/src/client/core.test.ts`
- Create: `server/admin-next/src/client/core.ts`

**Interfaces:**
- Consumes: browser pathname, stored auth JSON, resource list options, arbitrary record values, and chart dimensions.
- Produces: `normalizeRoute(pathname): RouteId`, `readAuth(raw, now): AuthSession | null`, `buildResourceQuery(options): string`, `getValue(record, path): unknown`, `toCSV(rows, columns): string`, and `linePoints(values, width, height): string`.

- [ ] **Step 1: Write failing native Node tests**

Create tests using `node:test` and `node:assert/strict` that assert:

```ts
assert.equal(normalizeRoute('/admin-next/users/'), 'users');
assert.equal(normalizeRoute('/admin-next/not-real'), 'dashboard');
assert.equal(readAuth(JSON.stringify({ token: 't', username: 'a', expiredAt: 100 }), 99)?.token, 't');
assert.equal(readAuth(JSON.stringify({ token: 't', username: 'a', expiredAt: 100 }), 100), null);
assert.equal(buildResourceQuery({ page: 2, perPage: 20, sort: 'createdAt', order: 'DESC', search: 'moon' }), '_sort=createdAt&_order=DESC&_start=20&_end=40&q=moon');
assert.equal(toCSV([{ name: 'a,b', note: 'say "hi"' }], [{ key: 'name', label: 'Name' }, { key: 'note', label: 'Note' }]), 'Name,Note\r\n"a,b","say ""hi"""');
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `pnpm --dir server/admin-next test`
Expected: FAIL because `./core` does not exist.

- [ ] **Step 3: Implement the minimum core helpers**

Use `URLSearchParams`, `JSON.parse`, dot-path reduction, RFC 4180-compatible field quoting, and direct SVG point scaling. Keep route IDs in one readonly set shared by `normalizeRoute` and the application route table.

- [ ] **Step 4: Run the tests and confirm GREEN**

Run: `pnpm --dir server/admin-next test`
Expected: all tests pass with no warnings.

### Task 3: Implement authentication, bilingual shell, and navigation

**Files:**
- Create: `server/admin-next/src/client/auth.tsx`
- Create: `server/admin-next/src/client/api.ts`
- Create: `server/admin-next/src/client/i18n.tsx`
- Create: `server/admin-next/src/client/icons.tsx`
- Create: `server/admin-next/src/client/components.tsx`
- Create: `server/admin-next/src/client/App.tsx`
- Create: `server/admin-next/src/client/main.tsx`
- Create: `server/admin-next/src/client/styles.css`
- Create: `server/admin-next/src/client/vite-env.d.ts`

**Interfaces:**
- Consumes: core helpers from Task 2 and API prefix `/admin-next/api`.
- Produces: `useAuth()`, `api<T>(path, init)`, `useI18n()`, `navigate(route)`, `AppShell`, `Modal`, `ToastProvider`, form controls, data-state components, and authenticated route rendering.

- [ ] **Step 1: Add a failing dictionary and request-contract test**

Extend `core.test.ts` to require every route ID to have non-empty Chinese and English labels and to require `requestHeaders('token', false)` to include `Authorization: Bearer token` without forcing a multipart content type.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --dir server/admin-next test`
Expected: FAIL because the dictionary and request-header helpers are absent.

- [ ] **Step 3: Implement login and the approved application shell**

Implement credential login, local expiry enforcement, centralized 401 logout, persisted language selection, native History navigation, 260px desktop sidebar, 62px top bar, mobile drawer, scrim, language switch, account logout, command palette, visible keyboard focus, Escape handling, and focus restoration. Copy only the approved logo into `public`.

- [ ] **Step 4: Complete the request and translation helpers**

Return parsed JSON for JSON responses, plain text for non-JSON failures, preserve `FormData` boundaries, expose list totals, and include every navigation, action, field, validation, empty, loading, and error string in both languages.

- [ ] **Step 5: Run tests and client type checking**

Run: `pnpm --dir server/admin-next test && pnpm --dir server/admin-next check:type`
Expected: exit 0.

### Task 4: Implement real overview and analytics pages

**Files:**
- Modify: `server/admin-next/src/client/core.test.ts`
- Modify: `server/admin-next/src/client/core.ts`
- Modify: `server/admin-next/src/client/components.tsx`
- Create: `server/admin-next/src/client/pages/Overview.tsx`
- Modify: `server/admin-next/src/client/App.tsx`

**Interfaces:**
- Consumes: `api`, list totals, `linePoints`, visual primitives, and translations.
- Produces: `DashboardPage`, `AnalyticsPage`, `LineChart`, and `BarChart` backed only by current API data.

- [ ] **Step 1: Add failing geometry edge-case tests**

Assert that `linePoints([], 100, 40)` returns an empty string, a one-point series is centered, and a flat series remains finite without `NaN` or `Infinity`.

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --dir server/admin-next test`
Expected: FAIL on the unimplemented geometry behavior.

- [ ] **Step 3: Implement minimal responsive SVG charts and pages**

Load the four real totals, both 14-day summaries, and all four analytics endpoints. Render skeleton, empty, error, and loaded states. Use SVG `polyline`, gradients, axes, bars, and accessible text; do not synthesize deltas or sample points.

- [ ] **Step 4: Run tests and production client build**

Run: `pnpm --dir server/admin-next test && pnpm --dir server/admin-next build:client`
Expected: exit 0 with no missing route or asset errors.

### Task 5: Implement generic resource CRUD and custom admin actions

**Files:**
- Modify: `server/admin-next/src/client/core.test.ts`
- Modify: `server/admin-next/src/client/core.ts`
- Create: `server/admin-next/src/client/resources.ts`
- Create: `server/admin-next/src/client/pages/Resources.tsx`
- Modify: `server/admin-next/src/client/App.tsx`

**Interfaces:**
- Consumes: JSON-server list protocol, generic API mutations, resource schemas, modal, table, form controls, and toast.
- Produces: users, groups, login logs, messages, files, mail, and discover pages with exact capability flags and custom user/group/file actions.

- [ ] **Step 1: Add failing record and export tests**

Assert `getValue({ members: ['a'], metaData: { 'content-type': 'x' } }, 'members.length') === 1`, preserve literal keys such as `metaData.content-type`, and verify CSV converts booleans, arrays, objects, null, commas, quotes, and line breaks deterministically.

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --dir server/admin-next test`
Expected: FAIL on the new nested-value and export cases.

- [ ] **Step 3: Implement the resource schema and shared list UI**

Define exact legacy fields and create/edit visibility. Implement search, usage and chat-only filters, sort, page size, pagination, refresh, row selection, detail, create, edit, confirmed delete, confirmed batch delete, and filtered all-page CSV export. Keep table minimum widths and horizontal scrolling.

- [ ] **Step 4: Implement real custom actions**

Users: reset password with the legacy hash, ban, and unban. Groups: create through the existing endpoint and add a selected user through `group.addMember`. Files: fetch total storage and preserve the `meta=onlyChat` query. Disable actions while pending and reload only after success.

- [ ] **Step 5: Run behavior, type, and client build checks**

Run: `pnpm --dir server/admin-next test && pnpm --dir server/admin-next check:type && pnpm --dir server/admin-next build:client`
Expected: exit 0.

### Task 6: Implement infrastructure, notification, and system settings

**Files:**
- Modify: `server/admin-next/src/client/core.test.ts`
- Modify: `server/admin-next/src/client/core.ts`
- Create: `server/admin-next/src/client/pages/Infrastructure.tsx`
- Create: `server/admin-next/src/client/pages/System.tsx`
- Modify: `server/admin-next/src/client/App.tsx`

**Interfaces:**
- Consumes: network, cache, callAction, config, upload, and notify endpoints plus ByteMD.
- Produces: network registry and ping UI, Socket.IO instructions, confirmed cache cleaning, validated Markdown notifications, and editable system settings.

- [ ] **Step 1: Add failing validation tests**

Add `validateNotification(scope, users, title, content)` tests that reject empty title/content and specified scope without users, and accept a complete all-user or selected-user payload.

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm --dir server/admin-next test`
Expected: FAIL because notification validation is absent.

- [ ] **Step 3: Implement infrastructure pages**

Render actual network nodes, registry lists, and ping latency/status; derive the Socket.IO URL from `window.location`; open the existing `/socketio/admin/` destination; and confirm both cache targets before posting to `/cache/clean`.

- [ ] **Step 4: Implement notification and system pages**

Use ByteMD for Markdown content, searchable real user selection for specified recipients, and server-confirmed counts. Read all client policy values; patch server name on explicit save; upload or remove server entry image; and save an enabled or disabled announcement with text and optional link.

- [ ] **Step 5: Run the complete package build**

Run: `pnpm --dir server/admin-next test && pnpm --dir server/admin-next build`
Expected: client and server builds both exit 0.

### Task 7: Verify coexistence and responsive visual behavior

**Files:**
- Modify only files already in scope when a verification failure identifies a defect.

**Interfaces:**
- Consumes: completed `server/admin-next` package and unchanged `server/admin` package.
- Produces: reproducible build, behavior, and visual acceptance evidence.

- [ ] **Step 1: Build both admin packages**

Run: `pnpm --dir server/admin-next test && pnpm --dir server/admin-next build && pnpm build:admin`
Expected: all commands exit 0.

- [ ] **Step 2: Run the application when services are available**

Run: `pnpm --dir server/admin-next dev`
Expected: the new UI is reachable at `http://localhost:3100/admin-next/`; the legacy admin can still use port 3000. If MongoDB or the transporter is unavailable, record the exact blocker and continue with static preview checks.

- [ ] **Step 3: Inspect desktop, tablet, and mobile states**

Check 1440x900, 1024x768, and 390x844. Verify login, authenticated shell where available, sidebar drawer and scrim, table scrolling, unsqueezed cards, command palette keyboard behavior, destructive confirmation, focus visibility, and Chinese/English switching.

- [ ] **Step 4: Run final repository checks**

Run: `git diff --check && git status --short --branch --untracked-files=all`
Expected: no whitespace errors; only the design, plan, workspace entry, and `server/admin-next` files are changed.

- [ ] **Step 5: Report the handoff**

Report changed files, exact successful commands, any environment-dependent skipped checks, visual findings, and the separate run and preview commands. State explicitly that no cutover, commit, push, or deployment occurred.
