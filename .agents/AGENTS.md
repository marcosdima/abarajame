# Abarajame — Agent System & Workspace Rules

This repository uses a specialized multi-agent team configured for mobile application and tabletop card game development on top of `alambre`, `@some-alambre/ui`, and `@some-alambre/room-relay`.

## 1. Roles & Topology

| Identifier | Definition | Tier | Write Authority | Responsibility |
| --- | --- | --- | --- | --- |
| **`@lead`** | `.agents/agents/lead/agent.md` | `pro` | Full (`src/**`, `App.tsx`) | Primary orchestrator and sole author of production code; game architecture, engines, screens, stores, navigation, and validation. `mainAgent`. |
| **`@reviewer`** | `.agents/agents/reviewer/agent.md` | `flash` | Read-only | Codebase investigation, architecture boundaries (pure engine vs React), public contracts, and regression audits. |
| **`@ui-reviewer`** | `.agents/agents/ui-reviewer/agent.md` | `flash` | Read-only | Static UI/UX audit: `@some-alambre/ui` component adoption, semantic theme tokens, `fontFamily` propagation, and accessibility. |
| **`@tester`** | `.agents/agents/tester/agent.md` | `flash` | `tests/**` only | Vitest unit and integration testing for game engine rules, meld solvers, room relay, and stores. |

## 2. Progressive-Disclosure Skills

Agents automatically load the relevant skill on demand when working in its domain:

| Skill | Path | Domain |
| --- | --- | --- |
| **`alambre-ui`** | `.agents/skills/alambre-ui/SKILL.md` | `@some-alambre/ui` components, props, semantic theme tokens, `fontFamily` propagation, and kinetic text. |
| **`alambre-state-storage`** | `.agents/skills/alambre-state-storage/SKILL.md` | `createStore`, `createCollection`, `createConfig`, `createLang`, `createLightDark`, `createSensoryCues`, `useHistoryState`, `useStopwatch`, and storage adapters. |
| **`alambre-navigation-overlays`** | `.agents/skills/alambre-navigation-overlays/SKILL.md` | `NavigatorProvider`, `pages` & `subpages`, `useNavigator()`, `useConfirm()`, and `useToast()`. |
| **`alambre-kinetics-dnd`** | `.agents/skills/alambre-kinetics-dnd/SKILL.md` | `kinetics` presets, `useInteractiveHand`, `calculateResponsiveHandFan`, `usePressKinetics`, `DndProvider` (`Draggable`, `Droppable`), and `AlambreIcons`. |
| **`alambre-room-relay`** | `.agents/skills/alambre-room-relay/SKILL.md` | `@some-alambre/room-relay` multiplayer rooms (`useRoomRelay`), authoritative turn engine (`useTurnEngine`), room codes, and seeded PRNG (`createSeededRng`). |

## 3. Core Application Conventions

1. **Design System First (`@some-alambre/ui`):**
   Use standard primitives (`AppTitle`, `AppText`, `AppButton`, `AppCard`, `AppBadge`, `AppChip`, `AppTextInput`, `AppSwitch`, `AppSlider`, `AppStepper`, `AppSelect`, `AppNumberPicker`, `AppSegmentedControl`, `AppAccordion`, `AppDialog`, `AppActionSheet`, `ToggleLightDark`, `ConfirmDialog`) for lobbies, menus, settings, scoreboards, and forms.
2. **Theme, Typography & Provider Tree:**
   - Keep `<ThemeProvider theme={{ ...theme, fontFamily: config.fontFamily }}>` hoisted at the top of `App.tsx` above `NavigatorProvider`, `ConfirmProvider`, `ToastProvider`, and `Root`.
   - Consume colors and typography via `useTheme()` (`@some-alambre/ui`) or `useLightDark()` (`src/providers/theme.ts`). Never hardcode hex/RGB literals.
   - Use `AppText` / `AppTitle` so `theme.fontFamily` applies automatically; bind `fontFamily` explicitly on any custom `<Text>` or `<Animated.Text>`.
3. **Pure Game Engine Separation:**
   All card game rules, meld solvers, scoring, and bot policies must live in pure TypeScript modules (`src/engine/`) with zero React or React Native imports. Game state must be JSON-serializable to support `@some-alambre/room-relay` snapshots.
4. **Tabletop Kinetics & Spatial Hooks (`alambre`):**
   Use `alambre`'s built-in spatial/card hooks (`useInteractiveHand`, `reorderHandItems`, `calculateResponsiveHandFan`, `useDealCascade`, `useCardToss`, `useKineticSwipe`, `useSpatialFlip`, `generateStackJitter`, `DndProvider`) rather than re-implementing hand math or flight physics in the app.
5. **Multiplayer & Turn Sync (`@some-alambre/room-relay`):**
   - Use `useRoomRelay` / `createRoomRelay` (`SimulatedRelayTransport` for local/bot tables, `WebSocketRelayTransport` for multi-device private rooms).
   - Use `useTurnEngine` / `createTurnEngine` for host-authoritative state transitions (`TurnReducer<TState, TAction>`, `validateAction`).
   - Use `shuffleWithSeed` / `createSeededRng` for deterministic deck operations.
6. **Localization & Headless State:**
   - Register pages and subpages in `src/navigator/navigator.tsx` with localized `title: (lang) => ...` functions.
   - Define all user-facing copy in both `es` and `en` inside `src/providers/lang.tsx` (`useLang()`).
   - Keep business state in headless stores (`createConfig`, `createCollection`, `createSensoryCues`).
7. **Accessibility by Default:**
   Provide `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`, and maintain a 44x44pt minimum touch target.

## 4. Communication Directives

- **Language:** Respond in the language used by the user unless explicitly requested otherwise. Internal agent delegation prompts must be in English.
- **Tone:** Be concise, direct, and technical. Eliminate flattery, filler, and conversational padding.
- **Critical Stance:** Challenge assumptions, surface hidden edge cases, and push back on over-engineered or underspecified ideas before writing code.

## 5. Validation Order

Run from the project root before completing any task:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
