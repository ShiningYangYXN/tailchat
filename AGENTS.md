# Tailchat Agent Guide

## Scope and priorities

This file applies to the entire repository. It is guidance for coding agents,
not a replacement for `README.md`, `README.zh.md`, or the long-form website
documentation. A direct user request always takes precedence.

Tailchat is a noIM platform: messaging is the collaboration core and plugins
are first-class product extensions. Preserve that model when choosing where a
change belongs.
The primary runtime flow is:

1. The web entry configures shared adapters and loads MiniStar plugins.
2. React UI calls APIs, Socket.IO, state, and domain helpers in `client/shared`.
3. The gateway maps HTTP or socket requests to Moleculer `TcService` actions.
4. Services validate, authenticate, authorize, coordinate, and access models.
5. Notifications return through Socket.IO and update shared client state.

Do not bypass this flow by coupling core UI to plugin internals, accessing data
around service actions, or relying on client-side authorization.

## Distributed deployment assumptions

Tailchat is deployed as a distributed system and may run multiple gateway and
service instances. Treat this as a design constraint for every backend feature,
even when local development uses a single process.

- Do not keep correctness-critical shared state only in process memory. Store it
  in MongoDB, Redis, or another configured shared service; local memory may be
  used only as a disposable optimization.
- Assume concurrent requests for the same user or resource can reach different
  instances. Use database atomic operations, transactions, Redis Lua scripts,
  locks, idempotency keys, or another appropriate distributed coordination
  mechanism when correctness depends on ordering or exclusivity.
- Do not rely on sticky sessions, a particular service instance, local timers,
  or in-process event delivery for cross-request correctness.
- Namespace shared keys by deployment and domain, set bounded TTLs where
  appropriate, and define cleanup behavior for configuration changes and
  deleted resources.
- For time-window behavior, account for clock skew between nodes. Prefer a
  shared authoritative clock, such as Redis server time, when the decision and
  countdown must agree across instances.
- Decide and document whether a shared-dependency failure should fail open or
  fail closed. Add focused concurrency and failure-path tests for distributed
  state rather than validating only the single-instance happy path.

## Repository map

- `client/web`: browser application, routes, browser integration, and plugin host.
- `client/shared`: cross-platform API, socket, state, hooks, models, and utilities.
- `client/packages`: frontend design system, client SDK, and build-time tooling.
- `client/web/plugins`: pure frontend plugins and their manifests.
- `server/services`: core and OpenAPI Moleculer services.
- `server/models`: Typegoose persistence models.
- `server/packages/sdk`: `TcService`, gateway, permission, runner, and SDK contracts.
- `server/plugins`: backend or full-stack plugins, sometimes with embedded web UI.
- `server/admin`: separate Vite/React frontend and Express admin service.
- `packages/types`: published structures shared across package boundaries.
- `client/desktop`: current Electron shell; it loads a Tailchat web deployment.
- `client/mobile`: React Native WebView shell and native bridges.
- `client/desktop-old`: legacy implementation; do not use it as the default target.
- `apps`: non-core CLI, GitHub app, OAuth demo, and embeddable widget.
- `website`: Docusaurus documentation and marketing site.

Read the nearest package scripts and local documentation before editing. Some
subprojects have distinct build systems even when their source lives here.

## Working protocol

1. Start with `git status --short --branch --untracked-files=all`.
2. Trace the real entry point, caller, contract, and tests before changing code.
3. Follow an existing service, model, component, or plugin pattern when possible.
4. Make the smallest coherent change; avoid unrelated cleanup and refactoring.
5. Preserve unrelated staged, unstaged, ignored, and untracked user work.
6. Add or update focused tests beside the behavior being changed.
7. Run checks proportional to the affected subsystem.
8. Report exact commands, failures, skipped checks, and environment blockers.
9. Never expose passwords, JWT secrets, API tokens, admin credentials, or `.env` contents in source, logs, tests, generated artifacts, or responses.

Do not run repository-wide `pnpm lint:fix` by default. It can rewrite files
outside the task. Lint or format only files in scope.

Do not edit `node_modules` or generated `dist`/build/coverage/runtime output as source. Tracked tooling under `client/build` and `client/web/build` is source.

## Toolchains and package ownership

CI and Docker define the main baseline: Node.js 18 and pnpm 8.15.8. A newer
machine-local Node or pnpm version does not expand supported compatibility.

Use pnpm for the root workspace. Install with:

```bash
pnpm install --frozen-lockfile
```

The root `pnpm dev` starts the server and web development processes. Local
development also needs the configured MongoDB, Redis, and MinIO dependencies;
the default web and gateway ports are 11011 and 11000.

`client/desktop`, `client/mobile`, and `client/desktop-old` keep independent
Yarn lockfiles. Run Yarn from the owning directory and do not rewrite those
locks with pnpm.

Dependency changes must update the owning manifest and matching lockfile. Avoid
lockfile churn unrelated to the requested dependency change.

## Frontend rules

- Keep plugin initialization before application rendering in `client/web`.
- Use `client/shared` only for behavior that is genuinely cross-platform.
- Keep DOM, browser, Electron, and React Native behavior in platform layers.
- Reuse shared request and socket wrappers; preserve token and error handling.
- Keep remote-event to local-state synchronization in the established Redux flow.
- Reuse existing design components and registration APIs before adding globals.
- User-visible core strings use existing `t`, `Trans`, and translation workflows.
- Frontend permission checks control presentation only, never final authorization.

The web TypeScript configuration excludes plugin source. A successful core web
type check does not prove that frontend plugins compile; run the MiniStar build
when plugin code or plugin-facing exports change.

## Backend rules

- Implement service behavior through `TcService` and a stable `serviceName`.
- Register actions in `onInit` and declare concrete parameter validation.
- Keep actions authenticated unless a public endpoint is deliberately reviewed.
- Treat auth whitelists, action visibility, and socket exposure as security boundaries.
- Perform final authorization in the service before reading or mutating data.
- Use `call(ctx)` or explicit service calls for cross-service behavior.
- Keep services focused; do not accumulate unrelated domains in one service.
- Preserve cache invalidation, notifications, and room membership when data changes.
- Use Typegoose models for persistence and avoid leaking protected model fields.
- Prefer backward-compatible optional/default fields for persisted schema changes.
- Add a migration under `server/scripts/migrations` when existing data needs rewriting.

Group permissions are a cross-layer contract. When adding or renaming one,
update both `client/shared/utils/role-helper.ts` and
`server/packages/sdk/src/services/lib/role.ts`, then enforce it server-side.

## Plugin rules

- Use reverse-domain IDs such as `com.msgbyte.example` consistently.
- Pure frontend plugins belong in `client/web/plugins/<id>`.
- Backend/full-stack plugins belong in `server/plugins/<id>`.
- Keep directory names, manifest names, service names, URLs, and keys aligned.
- Register extensions through `@capital/common` or `@capital/component` APIs.
- Use plugin-scoped request helpers; do not forward Tailchat credentials elsewhere.
- Keep plugin translations local using the existing `localTrans` pattern.
- Check manifests, entry registration, assets, and `requireRestart` behavior together.

For full-stack plugins, verify the service/model implementation and the embedded
web plugin. A frontend-only success is not proof that the complete plugin works.

`client/web/src/plugin/builtin.ts` is the forced-install list.
`client/web/registry.json` is the frontend store registry.
`server/public/registry-be.json` is produced while installing server plugins.
Change only the list that owns the requested behavior.

## Contracts, generated files, and documentation

Treat these as compatibility-sensitive public contracts:

- shared types and SDK exports;
- service action names, parameters, results, and visibility;
- socket notification names and payloads;
- plugin registration APIs and manifests;
- persisted document shapes and permission identifiers.

Check all known consumers before changing a contract. Prefer additive changes
and explain unavoidable breaking changes.

Generated artifacts must follow their source and owning command:

- `client/web/tailchat.d.ts`: `pnpm --dir client/web plugins:declaration:generate`.
- `server/openapi.json`: `pnpm --dir server gen:openapi`.
- client core translations: `pnpm --dir client translation`.
- server translations: `pnpm --dir server translation`.
- website plugin lists: `pnpm --dir website gen:plugin-doc`.
- server web-plugin assets/registry: the relevant `server` `plugin:install` flow.

Review generated diffs and commit them only when their source contract changed.
Do not hand-edit generated output into disagreement with its generator.

Update `website/docs` when changing public commands, environment behavior,
deployment, plugin APIs, OpenAPI behavior, or other user-facing contracts.
Keep English source docs and existing Chinese translations consistent when both
versions cover the changed material.

## Verification by scope

Run focused checks first, then broaden only when the change crosses boundaries.

| Change scope | Minimum verification |
| --- | --- |
| Web or `client/shared` | `pnpm --dir client/web check:type` and focused `pnpm --dir client/web test --runInBand <test-path>` |
| Web bundling/dependencies/plugin host | Above plus `pnpm --dir client/web build` |
| Server service/model/plugin | `pnpm --dir server check:type` and focused `pnpm --dir server test --runInBand <test-path>` |
| Server SDK | `pnpm --filter tailchat-server-sdk build` plus a relevant server consumer check |
| Shared published types | `pnpm --filter tailchat-types build` plus relevant client/server checks |
| Frontend plugin | Relevant Jest test and `pnpm --dir client/web plugins:all` |
| Full-stack plugin | Server checks plus that plugin's `build:web` script and manifest review |
| Admin | `pnpm build:admin` |
| Website | `pnpm --dir website build` |
| Cross-layer TypeScript | Focused checks plus root `pnpm check:type` |

Server integration tests may require MongoDB and other configured services.
State what was available rather than silently skipping or misreporting them.

The root type check covers the core web and server projects, not every package,
plugin web bundle, native shell, admin build, or documentation build. The root
`pnpm build` is a packaging-level check; use it when the task affects packaging
or crosses those boundaries, not for every small edit.

Never claim a check passed unless it completed successfully. When a check fails,
separate a new regression from a reproduced baseline failure or environment
blocker and include the relevant error summary.

Before handoff, run:

```bash
git diff --check
git status --short --branch --untracked-files=all
```

## Git and delivery

Do not commit, push, create a release, or open a pull request unless the task
requests it. If asked, keep commits narrowly scoped and stage only intended files.

Use Angular/Conventional Commits style for commits and pull-request titles:

```text
<type>(<scope>): <summary>
fix(chat): adjust TTS popup spacing
feat(image): add prompt presets
```

Use a lowercase type such as `fix`, `feat`, `chore`, `refactor`, `test`, `docs`,
`build`, `ci`, `perf`, or `revert`. Use a concise lowercase scope when clear.
Keep the summary short and imperative, with no trailing period.

When creating a pull request, do not add a body unless explicitly requested.
Final handoff should summarize changed files, verification performed, remaining
failures or risks, and whether any generated or documentation updates were needed.
