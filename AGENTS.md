# SourceCraft Static Site Template

## Hard Rules

- Work as autonomously as possible.
- This template builds static frontend sites only.
- Never add databases, application API routes, Server Actions, server-side mutations, authentication servers, background jobs, or runtime persistence.
- Keep next.config.ts configured with output: "export".
- Use docker compose, not docker-compose.
- Use only port 8080. Browser smoke tests go through http://localhost:8080 with playwright-cli.
- Never shut down the dev server. Starting it and restarting or recreating the app container are allowed.
- Run build, check, lint, format, and typecheck commands locally on the host, never through docker compose exec.
- Keep app/api/health/route.ts as a build-generated static response.
- Keep BridgeProvider, its handshake behavior, the inspector integration, and Toaster intact.

## Environment

- Tech stack: Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui.
- npm run build generates the deployable static site in out/.
- The user accesses the app through a remote HTTPS proxy, while local smoke tests use http://localhost:8080.
- Internet access is available. Prefer official sources for framework and block lookups, with local fallbacks when external access fails.

## Request Classification

Every request must remain a static frontend site. Suitable work includes landing pages, portfolios, documentation, marketing pages, dashboards with build-time data, and browser-only interactive experiences.

If a requested feature requires trusted secrets, server-side writes, private authentication logic, webhooks, scheduled jobs, or persistent shared state, explain that it does not fit this template. Do not simulate a backend with local files, mock API routes, or another persistence layer.

## Command Policy

| Action                        | Command                                   | Where |
| ----------------------------- | ----------------------------------------- | ----- |
| Check dev server              | docker compose ps                         | host  |
| Start dev server              | docker compose up -d                      | host  |
| Restart unhealthy app         | docker compose up -d --force-recreate app | host  |
| Typecheck                     | npm run typecheck                         | host  |
| Lint                          | npm run lint                              | host  |
| Format                        | npm run format                            | host  |
| Full static check             | npm run check                             | host  |
| Production static build       | npm run build                             | host  |
| Inspect shadcn project        | npx shadcn@latest info                    | host  |
| Add shadcn primitive or block | npx shadcn@latest add <name>              | host  |
| Install packages              | npm install ...                           | host  |
| Clean local build output      | rm -rf .next out                          | host  |

- If browser smoke tests are needed, start by checking docker compose ps. If the app container is not running, use docker compose up -d.
- Restart or recreate the app container only when docker compose ps explicitly shows it as unhealthy. Never use docker compose down.
- If the app container is running and not unhealthy but the app does not respond, diagnose or report the blocker instead of restarting.
- If port 8080 is occupied by an unrelated process, report the blocker instead of switching ports.
- npm run format mutates files. Run it only after code edits.
- The container has non-standard runtime environment values and can produce false build failures. Diagnose TypeScript, ESLint, React, or formatting issues locally.

## Repo Map

- Main page: app/page.tsx. Replace the starter screen wholesale on the first real build.
- Root chrome and metadata: app/layout.tsx. Product name lives in the single appName constant.
- Global styles and visual utilities: app/globals.css.
- Reusable components: components/.
- shadcn/ui primitives: components/ui/.
- Preview bridge: components/bridge-provider.tsx, components/inspector-overlay.tsx, and lib/bridge/.
- Platform health artifact: app/api/health/route.ts.
- Static or build-time data: lib/data.ts when extraction from a page is useful.

## First Real Build

- Replace the starter page in app/page.tsx.
- Update only the single appName constant in app/layout.tsx for product naming.
- Keep app/api/health/route.ts, BridgeProvider, the handshake behavior, the inspector integration, and Toaster.
- Keep all application routes compatible with static export.

## Static Data And Interaction

- Hardcode small datasets inline or place reusable datasets in lib/data.ts.
- Server Components may read deterministic local data or fetch public build-time data.
- Do not use request headers, cookies, sessions, or runtime-only environment values.
- Dynamic route segments require generateStaticParams() with every deployable path known at build time.
- Put state, effects, event handlers, browser APIs, and client-side network calls in client components with "use client".
- Browser-local state such as URL parameters or localStorage is allowed when the product requires it, but it is not shared persistence.
- Client-side calls to explicitly requested public third-party APIs are allowed. Never expose secrets in browser code.
- Forms may validate and update local UI state. External form submission requires an explicitly requested browser-safe endpoint.
- Use zod for non-trivial client form validation and derive form types with z.infer.

## Server And Client Components

- app/\*\*/page.tsx is a Server Component by default: no state, effects, event handlers, or browser APIs.
- Never pass handler props such as onClick, onChange, or onSubmit from a server page into client primitives.
- Put interactive UI, local state, effects, optimistic updates, and Sonner feedback in client components under components/ with "use client" at the top.
- Server pages stay thin and pass only plain serializable props into client components.
- Split components by mixed concerns, not line count. Extract a component when it owns at least two independent state or effect concerns.

## UI Rules

- Stay inside shadcn/ui. Do not introduce another component library.
- Use lucide-react for icons. Do not use emoji icons or other icon sets.
- Use Sonner for user feedback. Do not use alert() or confirm().
- Use shadcn Skeleton for loading states.
- Empty states use a Lucide icon in a muted circle, a one-line message, and an optional CTA.
- Use tw-animate-css classes such as animate-in fade-in slide-in-from-bottom-4 duration-500.
- Do not write custom keyframes or add an animation library unless the request truly needs gesture or layout animation.
- Reuse visual utilities in app/globals.css, including gradient-hero-vibrant, pattern-grid, and card-hover.
- Limit the page to one flashy visual element.

## shadcn Workflow

- Use the shadcn skill if available; it owns CLI usage, registry and documentation lookup, add and diff flows, and post-add review.
- Check whether components/ui/<name>.tsx already exists before adding it.
- Do not overwrite existing UI files if the CLI prompts.
- If the CLI cannot fetch, continue with local shadcn primitives and project patterns.
- If a block or registry item is requested without a registry name, use the official @shadcn registry.

## Assets

For images, media, logos, illustrations, backgrounds, avatars, screenshots, or other visual assets, use the asset-workflow skill if available. Otherwise follow the existing public/ conventions and do not add a new asset pipeline without a requirement.

## Build Verification

- For completed work, run npm run check and npm run build on the host.
- Confirm npm run build produces out/.
- For changed user flows or browser-visible behavior, smoke-test through http://localhost:8080 with playwright-cli.
- Do not run verification commands through docker compose exec.
- Treat a static-export build failure as a product constraint violation; do not disable output: "export" to bypass it.

## Common Pitfalls

- Date math and timezones: treat date-only strings as UTC.
- Do not mix setDate() or getDate() local-time methods with ISO date strings.
- Access window, document, navigator, and localStorage only in client components and only after the browser has mounted when necessary.
- next/image requires static-export-compatible image configuration; do not restore the default server image optimizer.
