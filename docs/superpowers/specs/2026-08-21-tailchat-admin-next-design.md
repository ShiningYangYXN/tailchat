# Tailchat Admin Next Design

Date: 2026-08-21
Status: Approved

## Objective

Build a complete replacement for the existing `server/admin` application in
`server/admin-next`. The replacement must run beside the legacy application,
cover its real administrative capabilities, remove Tushan, preserve Chinese
and English, and reproduce the approved Open Design project as a runnable React
application.

The legacy application remains unchanged and remains the production entry
until `admin-next` has been accepted separately.

## Source of truth

Behavior comes from the current `server/admin` client and server. Visual design
comes from version 5 of Open Design project
`f69073fe-c560-449c-a18d-4b668aaf9e00`, especially
`tailchat-admin.html` and `tailchat-logo.png`.

The implementation must preserve the design's two explicit corrections:

- the mobile sidebar becomes an accessible drawer instead of disappearing;
- cards and tables retain minimum widths and scroll instead of being squeezed.

## Coexistence boundary

`server/admin-next` is a separate Vite, React, Express, and TypeScript package.
It uses these independent runtime boundaries:

- browser base path: `/admin-next/`;
- API prefix: `/admin-next/api`;
- development and production port: `ADMIN_NEXT_PORT`, default `3100`;
- browser authentication key: `tailchat:admin-next:auth`;
- JWT platform: `admin-next`.

It reuses the deployment's existing `ADMIN_USER`, `ADMIN_PASS`, `SECRET`,
`MONGO_URL`, and `TRANSPORTER` settings. The complete existing admin backend is
copied into the new package so acceptance work cannot change the legacy admin
at runtime. The copied backend changes only the path, port, platform identity,
package output path, and branding required for independent operation.

The pnpm workspace gains `server/admin-next`. Root admin scripts, Docker,
release packaging, CI path filters, and production routing are deliberately not
switched in this phase.

## Frontend architecture

The client uses React 18, the browser History API, native `fetch`, CSS, Arco
Design, and Recharts. It does not use Tushan or React Router. Arco is consumed
through the existing common-control wrappers and inherits the approved dark
palette from local CSS tokens. The already-installed ByteMD packages remain
for the system notification editor. Existing small runtime libraries may be
retained where they materially reduce code, such as `dayjs` and `filesize`.

The application is divided into four practical layers:

1. authentication and API helpers;
2. application shell, navigation, bilingual strings, and common controls;
3. reusable resource table and record form behavior;
4. overview, infrastructure, notification, and system-settings pages.

Routes are represented below `/admin-next/`. Direct loads, browser back and
forward, command-palette navigation, and sidebar navigation resolve through the
same route table.

## Authentication and request flow

The login form posts the configured credentials to
`/admin-next/api/login`. A successful response stores username, token, and
expiry locally. Expired state is rejected before a protected request. Every
protected request sends `Authorization: Bearer <token>`. Any HTTP 401 clears
the stored state and returns to login.

The API helper supports JSON, `FormData`, error-text extraction, list totals
from `X-Total-Count`, and JSON-server-compatible list parameters. Resource
lists use `_sort`, `_order`, `_start`, `_end`, `q`, field filters, and the
existing file `meta=onlyChat` behavior. Mutations refresh confirmed server
state; there are no optimistic destructive writes.

Destructive actions require confirmation, disable controls while submitting,
surface server failures, and only show success after the API resolves. CSV
export follows the active filters and loads every result page through the
existing list API before producing the file.

## Functional parity

The new UI exposes these real capabilities:

| Area | Capability |
| --- | --- |
| Login | Admin credential login, two-hour JWT, expiry handling, logout |
| Dashboard | Real totals for users, groups, files, messages; 14-day user and message summaries; project links |
| Analytics | Seven-day active groups and users; largest groups; top file-storage users |
| Users | Search, pagination, sorting, detail, create, edit, delete, refresh, filtered CSV export, reset password, ban, unban |
| Groups | Search, pagination, sorting, detail, create, edit, delete, refresh, filtered CSV export, add member |
| Login logs | Search, pagination, sorting, detail, refresh, filtered CSV export |
| Messages | Search, pagination, sorting, detail, edit, delete, batch delete, refresh, filtered CSV export |
| Files | Search, usage filter, chat-only filter, total storage, sorting, detail, delete, batch delete, refresh |
| Mail | Pagination, sorting, detail, refresh |
| Discover | Pagination, sorting, detail, create, delete, refresh |
| Network | Real node, service, action, and event registries plus ping results |
| Socket.IO | Current server URL, connection instructions, and link to the real Socket.IO admin UI |
| Cache | Clear client-config cache or all cache with confirmation and server response |
| Notification | Send Markdown inbox notifications to all permanent users or selected users |
| System | Read client policy values; edit server name, entry image, and announcement |

Reset password preserves the legacy behavior and hash for the documented
temporary password `123456789`. Final authorization and all mutations remain
server-side.

## Visual system

The UI faithfully translates the approved design rather than creating another
generic dashboard:

- background `#0b0e14`, panel `#12151d`, raised surfaces `#171b24`,
  `#1b202b`, and `#222836`;
- primary blue `rgb(24, 144, 255)`, success `#3ba55d`, warning `#faa61a`,
  and danger `#ff4d4f`;
- 12px panel radii, 8px control radii, subtle borders, soft radial background
  light, and blue active-navigation rail;
- Inter for body text, Space Grotesk for display text, JetBrains Mono for
  technical values, with system fallbacks;
- the supplied local Tailchat cat logo is the only project image copied into
  the runtime.

Desktop uses a fixed 260px sidebar and a 62px translucent top bar. Content is
centered up to 1240px. At 1024px, KPI cards use two columns and chart grids use
one column. At 940px, the sidebar becomes a focus-managed drawer with a scrim
and hamburger control. At 560px, KPI cards use one column. Tables have explicit
minimum widths and horizontal scrolling at every breakpoint.

The top bar contains command search, language selection, and the account menu.
The prototype's nonfunctional notification bell and sample metrics are not
implemented. The command palette opens with Command-K or Control-K, supports
keyboard selection, and navigates only to real pages.

Reusable controls are limited to the repeated needs of this application:
application shell, sidebar, top bar, page header, statistic card, data table,
filters, form controls, modal or drawer, status badge, line and bar charts,
toast, loading state, empty state, and error state.

Transitions last 130-260ms. `prefers-reduced-motion` disables nonessential
motion. Keyboard focus is visible; dialogs close on Escape, trap focus, and
restore focus; the drawer closes after navigation.

## Internationalization

Every user-visible core string has Chinese and English forms. The initial
language follows a stored choice, then browser language, then English. The
top-bar switch persists the choice without reloading. Backend field names and
technical identifiers remain unchanged.

## Error, empty, and loading behavior

Each page distinguishes loading, empty data, API error, and loaded data. Page
requests that become stale are ignored or aborted. Forms preserve entered
values after server failures. Tables keep their previous page visible while a
refresh is in progress. Toasts report completed actions and actionable errors,
not speculative success.

## Verification and acceptance

Acceptance requires:

- a native Node test covering route normalization, authentication expiry,
  resource query construction, CSV escaping, and other extracted behavior;
- successful client type checking and Vite production build;
- successful copied-server TypeScript build;
- successful legacy `pnpm build:admin`, proving coexistence did not break the
  old package;
- login and authenticated-page runtime checks when MongoDB and the Moleculer
  transporter are available;
- visual checks at desktop, tablet, and mobile widths, including drawer,
  minimum card widths, table scrolling, command palette, login, and both
  languages;
- `git diff --check` and a final full untracked-file status review.

Environment-dependent checks must be reported as blocked rather than claimed
as passing.

## Non-goals

This phase does not delete or alter `server/admin`, change production routing,
replace root admin commands, update Docker images, deploy, commit, push, or cut
traffic over to the new UI. Those steps belong to a later acceptance and
cutover change.
