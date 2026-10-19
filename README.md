# Base Template

Canonical starting point for a new application on top of `alambre`. This is a **generic skeleton** — it carries no product logic; the reference product is `apps/colguetti` (inside the alambre monorepo).

## What is wired in

- Expo SDK 57 (managed, no prebuild committed; run native features with `npx expo run:android`).
- `@some-alambre/ui` tactile design tokens and accessible mobile components (`AppButton`, `AppCard`, `AppTextInput`, `AppBadge`, `ToggleLightDark`, `ConfirmDialog`).
- `alambre` capabilities and behaviors, connected through a `Storage` adapter over AsyncStorage:
  - `createConfig` (`src/providers/config.ts`)
  - `createLightDark` (`src/providers/theme.ts`)
  - `createLang` (es/en, `src/providers/lang.tsx`)
  - `NavigatorProvider` + `ToastProvider` with an app-owned toast body (`src/providers/toast.tsx`)
- Subpage navigation example: `navigate('home', { subpage: 'details' })`.
- Validation setup: ESLint, `tsc`, Vitest with one example test (`tests/storage.test.ts`).

## Start a new app from this template

The canonical standalone copy is published as a GitHub template repository (**`marcosdima/base-expo`**):

1. On GitHub, use **"Use this template"** to create a new app repository (or copy this folder and init your own git).
2. Rename the app identity: `name` in `package.json`, and `name`/`slug` in `app.json`.
3. `pnpm install` (or `npm install`) and adjust the Expo intro with your own identity.
4. Replace the placeholder views with your product screens.
5. Run checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

### Staying connected to alambre

The template depends on the **published** `alambre` package from the npm registry (pinned to the exact version at export time — the public contract is still pre-baseline, see `docs/framework/architecture.md` §9). The app is independent from the alambre repository; updates flow through npm/pnpm:

```bash
pnpm add alambre@latest     # or: npm install alambre@latest
```

### Working inside the alambre monorepo

`apps/base-template` is the canonical source of the template. Inside the monorepo it consumes `alambre` with the `workspace:*` protocol, and Metro resolves it from the TypeScript source (`metro.config.js` detects the monorepo and aliases the package). Run it and its checks with:

```bash
pnpm --filter @alambre/base-template start
pnpm --filter @alambre/base-template lint
pnpm --filter @alambre/base-template typecheck
pnpm --filter @alambre/base-template test
```

The standalone template repo is regenerated from this folder with `bash scripts/export-template.sh` (run from the monorepo root). The script verifies the exported app against the `alambre` version on npm and stops with publishing instructions if the registry copy is stale, so a fresh `npm publish` of `alambre` is required before the template can bootstrap working apps.
