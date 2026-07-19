# Tailchat Root AGENTS.md Design

Date: 2026-07-19
Status: Approved

## Objective

Create a root-level `AGENTS.md` that is automatically useful to coding agents
working anywhere in the Tailchat repository. The document will act as a compact
project constitution: it will explain the durable architecture, define change
boundaries and non-negotiable invariants, map changes to proportionate
verification, and encode the repository's delivery conventions.

The target length is approximately 180-220 lines. It is not a replacement for
the README, deployment documentation, plugin tutorials, or human contribution
guide.

The document will use concise English, matching the repository's primary public
documentation and the supplied agent/PR instructions. Existing identifiers and
domain terms remain unchanged.

## Chosen approach

Use one root-level constitution rather than a command-only cheat sheet or a
hierarchy of nested `AGENTS.md` files.

This approach is preferred because Tailchat is a monorepo with several distinct
toolchains and cross-layer contracts. A command-only document would omit the
plugin, permission, authentication, and shared-contract rules that prevent the
most expensive mistakes. Nested instruction files would be more precise, but
would add maintenance overhead and conflict with the requested single-file
scope.

## Project model to encode

Tailchat is a noIM platform: instant messaging is the collaboration core, while
plugins provide first-class product extensions. Its primary architecture is a
React and TypeScript frontend microkernel paired with a Moleculer backend made
of independently loadable services.

The root instructions will summarize these source-of-truth boundaries:

- `client/web`: the browser application, routes, browser-specific integration,
  and MiniStar plugin host.
- `client/shared`: cross-platform API, socket, state, hooks, domain models, and
  utilities shared by web-capable clients.
- `client/packages`: reusable frontend design, SDK, and declaration-generation
  packages.
- `client/web/plugins`: pure frontend plugins and their manifests.
- `server/services`: core and OpenAPI Moleculer services.
- `server/models`: Typegoose persistence models.
- `server/packages/sdk`: the `TcService` abstraction, service contracts,
  permissions, gateway support, and runner.
- `server/plugins`: backend or full-stack plugins, including embedded web
  plugins when present.
- `server/admin`: a separate Vite/React and Express administration system.
- `packages/types`: shared published data structures.
- `client/desktop` and `client/mobile`: separate Yarn-managed shells that load
  the Tailchat web client and bridge native capabilities.
- `client/desktop-old`: legacy desktop implementation; do not treat it as the
  default desktop target.
- `apps`: non-core applications such as the CLI, GitHub app, OAuth demo, and
  embeddable widget.
- `website`: Docusaurus documentation and marketing site.

## Runtime and data-flow model

The document will give agents a compact mental model of the main execution
path:

1. The web entry initializes shared adapters and loads MiniStar plugins before
   rendering the React application.
2. UI code calls the API/socket wrappers and domain functions in
   `client/shared`.
3. The gateway maps HTTP or Socket.IO calls to registered `TcService` actions.
4. Services validate parameters, authenticate and authorize the caller, invoke
   other services through explicit contracts, and access Typegoose models.
5. Server notifications return through Socket.IO and update Redux or other
   shared client state.

Agents must preserve this flow instead of bypassing shared adapters, plugin
registries, service actions, or server-side authorization.

## Required architectural invariants

The root document will encode the following rules:

- Keep browser, Electron, and React Native capabilities in their platform
  layers. Put only genuinely cross-platform behavior in `client/shared`.
- Load and extend frontend plugins through MiniStar registration points. Do not
  couple core UI directly to a plugin implementation when a registry contract
  exists.
- Use reverse-domain plugin identifiers consistently across directory names,
  manifests, service names, URLs, and registration keys.
- Put pure frontend plugins under `client/web/plugins`; put backend or
  full-stack plugins under `server/plugins`.
- Register backend behavior through `TcService`. New actions declare parameter
  validation and remain authenticated unless a public route is deliberately
  reviewed and added to an authentication whitelist.
- Treat action visibility and socket exposure as security boundaries.
- The client may hide unavailable actions, but the server performs final
  authorization. New group permission points must stay synchronized between
  frontend presentation and server enforcement.
- Never expose passwords, JWT secrets, API tokens, administrator credentials,
  or `.env` contents in source, logs, tests, generated artifacts, or responses.
- Treat shared types, SDK exports, plugin registration APIs, action names,
  notification names, and persisted schema changes as compatibility-sensitive
  contracts. Check all known consumers before changing them.
- Prefer backward-compatible optional/default model changes. Add a migration
  when existing persisted data must be transformed.
- Update generated declarations, OpenAPI artifacts, plugin registries,
  translations, and generated plugin-list documentation through their owning
  scripts when the source contract changes. Do not hand-edit generated output
  into disagreement with its source.

## Change workflow

The root document will instruct agents to:

1. Read the nearest source, tests, package scripts, and relevant documentation
   before editing.
2. Check the working tree and preserve unrelated staged, unstaged, and
   untracked work.
3. Follow an existing service, component, model, or plugin pattern before
   introducing a new abstraction.
4. Make the smallest coherent change and avoid unrelated refactors.
5. Add or update focused tests near the changed behavior.
6. Run verification proportional to the affected subsystem.
7. Report exact commands, failures, skipped checks, and environment blockers.

Repository-wide auto-fixing with `pnpm lint:fix` will not be the default because
it can rewrite unrelated files. Agents should lint or format only the files in
scope.

## Toolchain boundaries

The project baseline is Node.js 18 and pnpm 8.15.8, matching the current CI and
Docker build. Agents must not infer support from a newer machine-local Node or
pnpm version.

The pnpm workspace covers the root packages, web client, shared client code,
server, admin, plugins, public packages, apps, and website. The current desktop,
mobile, and legacy desktop clients keep independent Yarn lockfiles and must use
their local Yarn workflows.

Dependency edits must use the owning package manager and update the matching
lockfile. Generated build directories and installed dependencies are not source
changes.

## Verification matrix

The final `AGENTS.md` will provide a concise matrix rather than prescribing a
full build for every edit:

- Web or `client/shared`: run focused tests with
  `pnpm --dir client/web test --runInBand <test-path>` and type-check with
  `pnpm --dir client/web check:type`; run `pnpm --dir client/web build` for
  bundling, plugin-host, or dependency changes.
- Server services, models, SDK, or backend plugins: run server type checking and
  focused Jest tests with `pnpm --dir server check:type` and
  `pnpm --dir server test --runInBand <test-path>`. State whether required
  MongoDB, Redis, MinIO, or other integration dependencies were available.
- Cross-layer TypeScript changes: run root `pnpm check:type` after focused
  checks pass.
- Admin: run `pnpm build:admin`.
- Website: run `pnpm --dir website build`.
- Public packages and SDKs: run `pnpm --filter <package-name> build` and verify
  at least one relevant consumer when a public contract changes.
- Frontend plugins: test the affected plugin and verify its MiniStar build with
  `pnpm --dir client/web plugins:all`, plus its manifest and registration entry.
- Full-stack plugins: verify both the service/model side and embedded web plugin
  side; use the plugin's `build:web` script and regenerate registry assets when
  applicable.
- Deployment or packaging changes: use the owning build path, such as the root
  build or Docker build, only when the scope requires it.

Agents must not claim that a check passed unless it was run successfully. A
failure must be separated into newly introduced behavior, a reproduced baseline
failure, or an environmental blocker.

The current two Web Jest suites that fail on the ESM-only `rehype-sanitize`
dependency are intentionally excluded from the durable root document. Their
exact baseline is reported in the task handoff instead, so the constitution does
not preserve a transient defect as permanent policy.

## Internationalization, documentation, and generated files

User-visible core frontend and backend strings use the existing translation
helpers and translation-generation workflows. Plugin strings follow their
local translation pattern. Changes to commands, public configuration,
deployment, plugin APIs, or public contracts must update the relevant website
documentation in the same change.

The root instructions will identify generated artifacts by role and point to
their owning commands, without copying large generated-file inventories or
environment-variable tables.

## Delivery rules

Commits and pull-request titles use Angular/Conventional Commits form:
`<type>(<scope>): <summary>`. Types are lowercase, scopes are concise when
useful, summaries are short and imperative, and titles have no trailing period.

When creating a pull request, provide only the title unless the user explicitly
asks for a body.

## Non-goals

The root `AGENTS.md` will not:

- duplicate the complete README, deployment guide, environment-variable table,
  plugin tutorial, or plugin catalog;
- list every service, plugin, route, action, or package;
- prescribe a full repository build for every edit;
- encode transient test failures as permanent policy;
- require unrelated cleanup, dependency upgrades, or architectural rewrites;
- create nested `AGENTS.md` files in this task.

## Acceptance criteria

The implementation is accepted when:

- a single root `AGENTS.md` exists and is approximately 180-220 lines;
- it accurately describes the current project and directory ownership;
- it captures plugin, service, authorization, permission, public-contract,
  secret-handling, toolchain, and generated-file invariants;
- it contains concrete, scoped verification commands;
- it records the requested Conventional Commits pull-request title rules and
  the no-body-by-default rule;
- it does not duplicate long-form project documentation;
- `git diff --check -- AGENTS.md` passes and no unrelated files are changed by
  the implementation.
