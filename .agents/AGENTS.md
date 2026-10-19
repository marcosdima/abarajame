# Application Agent System (Base Template)

This directory defines the agent coordination rules for building applications starting from `base-template`. When this template is cloned to create a new mobile application, these rules govern AI-assisted product development.

## 1. Principles for Application Development

1. **Use `@some-alambre/ui` by Default:**
   Always use standard components from `@some-alambre/ui` (`AppButton`, `AppCard`, `AppBadge`, `AppActionSheet`, `AppDialog`, `AppTextInput`, `AppSwitch`, `AppSlider`, `AppStepper`, `AppTitle`, `AppAccordion`). Do not reinvent buttons, cards, or text inputs with raw `TouchableOpacity` or unstyled `View`.
2. **Semantic Theme Discipline:**
   Consume palette colors via `useLightDark()` (`theme.primary`, `theme.surface`, `theme.background`, `theme.color`, `theme.border`, etc.). Never write hardcoded hex color codes in component styles.
3. **Headless State & Storage:**
   Use `alambre` primitives for application logic:
   - Global reactive state: `createStore(initialState)`.
   - Persisted collections: `createCollection({ key, initialRecords })`.
   - History / undo-redo: `useHistoryState()`.
   - Stopwatches / timers: `useStopwatch()`.
   - Sensory cues (haptics / sound): `createSensoryCues()`.
4. **Accessible by Default:**
   Always provide `accessibilityLabel`, accessible roles (`role="switch"`, `role="button"`), and ensure touch targets meet the minimum 44x44pt standard.

## 2. Roles

| Role | Responsibility |
| --- | --- |
| **`@lead`** | Application builder. Owns production feature development, screen composition, navigation routing, and store wiring. |
| **`@reviewer`** | Design-system and code auditor. Verifies that screens respect `@some-alambre/ui` tokens, checks for hardcoded colors, and inspects accessibility. |
| **`@tester`** | QA engineer. Writes Vitest tests for domain state, formatters, and collection actions. |

## 3. Validation Workflow

Before finishing any feature:
1. `pnpm typecheck` — TypeScript verification.
2. `pnpm lint` — ESLint verification.
3. `pnpm test` — Unit test suite.
