---
name: alambre-ui
description: Tactile mobile UI components, design tokens, and typography from @some-alambre/ui. Use whenever building or auditing screens, cards, buttons, inputs, selects, dialogs, action sheets, switches, sliders, steppers, number pickers, accordions, or kinetic text animations. Always prefer @some-alambre/ui over raw React Native primitives or @expo/ui.
---

# `@some-alambre/ui` Design System & Components

Use `@some-alambre/ui` as the default component library for all screens and visual surfaces. Never reinvent buttons, cards, inputs, dialogs, or text with raw React Native primitives when a design-system component exists.

---

## 1. Theme & Typography Contract

### Provider Setup (`App.tsx`)
`<ThemeProvider>` must sit at the top of the provider tree (above `NavigatorProvider`, `ConfirmProvider`, `ToastProvider`, and `Root`) and receive both the active color palette and `fontFamily`:

```tsx
import { ThemeProvider } from '@some-alambre/ui';

<ThemeProvider theme={{ ...theme, fontFamily: config.fontFamily }}>
  {/* NavigatorProvider, ConfirmProvider, ToastProvider, Root */}
</ThemeProvider>
```

### Consuming Tokens (`useTheme`)
```tsx
import { useTheme } from '@some-alambre/ui';

const theme = useTheme();
```

| Token | Purpose |
| --- | --- |
| `theme.background` | Screen background color |
| `theme.surface` | Primary card / modal / sheet background |
| `theme.surfaceAlt` | Secondary container / track / header background |
| `theme.color` | Primary foreground text color |
| `theme.muted` | Secondary / subtitle / placeholder text color |
| `theme.primary` / `theme.primarySoft` / `theme.onPrimary` | Brand accent, soft tint background, and contrast text |
| `theme.secondary` / `theme.secondarySoft` | Secondary accent and soft tint |
| `theme.sand` / `theme.sandSoft` | Warm neutral accent and soft tint |
| `theme.border` / `theme.borderSoft` | Standard and subtle borders/dividers |
| `theme.success` / `theme.warning` / `theme.danger` / `theme.dangerSoft` | Semantic status colors |
| `theme.overlay` / `theme.overlayBar` | Modal backdrop and grabber bar colors |
| `theme.fontFamily` | Active global font family propagated to all `@some-alambre/ui` components |

**Strict Rules:**
- Never hardcode hex/RGB colors in component or view styles.
- Always render text with `AppText` or `AppTitle` so `theme.fontFamily` applies automatically. If a custom `<Text>` or `<Animated.Text>` is required, explicitly set `fontFamily: theme.fontFamily`.

---

## 2. Core Components Reference

### Typography: `AppTitle` & `AppText`
```tsx
import { AppTitle, AppText } from '@some-alambre/ui';

<AppTitle
  title="Dashboard"
  subtitle="Overview of your activity"
  badge="PRO"
  level={1} // 1 | 2 | 3 | 4
  align="left" // 'left' | 'center' | 'right'
/>

<AppText variant="body" muted={false}>
  Standard body copy that automatically inherits theme.color and theme.fontFamily.
</AppText>
```
- `AppText` variants: `'body' | 'caption' | 'label' | 'code'`.

### Buttons: `AppButton` (alias `Button`)
```tsx
import { AppButton } from '@some-alambre/ui';

<AppButton
  label="Save Changes"
  variant="solid" // 'solid' | 'soft' | 'outline' | 'ghost'
  tone="primary"  // 'primary' | 'neutral' | 'danger' | 'success'
  size="md"       // 'sm' | 'md' | 'lg'
  leftIcon={<Icon />}
  rightIcon={<Icon />}
  loading={false}
  disabled={false}
  fullWidth
  onPress={handleSave}
/>
```

### Containers: `AppCard` & `AppAccordion`
```tsx
import { AppCard, AppAccordion } from '@some-alambre/ui';

<AppCard
  variant="outlined" // 'elevated' | 'outlined' | 'filled' | 'ghost'
  title="Account"
  subtitle="Manage your profile settings"
  badge="Active"
  badgeTone="success" // 'primary' | 'neutral' | 'success' | 'warning' | 'danger'
  footer={<AppButton label="Update" onPress={onUpdate} />}
>
  {children}
</AppCard>

<AppAccordion
  title="Advanced Options"
  subtitle="Tap to expand"
  defaultExpanded={false}
>
  {children}
</AppAccordion>
```

### Badges & Chips: `AppBadge` & `AppChip`
```tsx
import { AppBadge, AppChip } from '@some-alambre/ui';

<AppBadge
  label="New"
  variant="soft" // 'solid' | 'soft' | 'outline'
  tone="primary" // 'primary' | 'neutral' | 'success' | 'warning' | 'danger'
  size="md"      // 'sm' | 'md' | 'lg'
  dot
/>

<AppChip
  label="Filter"
  selected={isSelected}
  onPress={() => setSelected(!isSelected)}
  onRemove={handleRemove}
/>
```

### Form Controls: `AppTextInput`, `AppSwitch`, `AppSlider`, `AppStepper`, `AppSegmentedControl`, `AppSelect`, `AppNumberPicker`
```tsx
import {
  AppTextInput,
  AppSwitch,
  AppSlider,
  AppStepper,
  AppSegmentedControl,
  AppSelect,
  AppNumberPicker,
} from '@some-alambre/ui';

<AppTextInput
  label="Username"
  placeholder="Enter username"
  value={name}
  onChangeText={setName}
  helperText="Visible to other players"
  errorText={error}
  clearable
/>

<AppSwitch
  label="Push Notifications"
  subtitle="Receive alerts on your device"
  value={enabled}
  onValueChange={setEnabled}
  tone="primary" // 'primary' | 'success' | 'danger'
  size="md"      // 'sm' | 'md' | 'lg'
/>

<AppSlider
  label="Volume"
  value={volume}
  onChange={setVolume}
  min={0}
  max={100}
  step={5}
  showValue
  formatValue={(v) => `${v}%`}
/>

<AppStepper
  label="Players"
  value={players}
  onChange={setPlayers}
  min={1}
  max={8}
  step={1}
/>

<AppSegmentedControl
  label="Difficulty"
  options={[
    { label: 'Easy', value: 'easy' },
    { label: 'Hard', value: 'hard' },
  ]}
  value={difficulty}
  onChange={setDifficulty}
/>

<AppSelect
  label="Category"
  placeholder="Choose a category"
  options={[
    { label: 'Sports', value: 'sports', description: 'Outdoor & indoor games' },
    { label: 'Music', value: 'music' },
  ]}
  value={category}
  onChange={setCategory}
/>

<AppNumberPicker
  label="Target Score"
  value={targetScore}
  onChange={setTargetScore}
  min={10}
  max={50}
  step={5}
/>
```

### Overlays: `AppDialog`, `AppActionSheet`, `ConfirmDialog`
```tsx
import { AppDialog, AppActionSheet } from '@some-alambre/ui';

<AppDialog
  visible={open}
  onClose={() => setOpen(false)}
  title="Delete Item?"
  description="This action cannot be undone."
  tone="danger" // 'primary' | 'danger' | 'warning' | 'success'
  confirmLabel="Delete"
  cancelLabel="Cancel"
  onConfirm={handleDelete}
  onCancel={() => setOpen(false)}
/>

<AppActionSheet
  visible={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Share Options"
  description="Select how you want to export"
  options={[
    { label: 'Copy Link', onPress: copyLink },
    { label: 'Delete', subtitle: 'Remove permanently', destructive: true, onPress: remove },
  ]}
/>
```

### Entrance & Text Animations
- `AnimatedCascade`: Wraps a list of children to animate their entrance (`pattern="stagger" | "wavefront"`, `staggerMs`).
- Kinetic Typography: `CountUpText`, `TypewriterText`, `MarqueeText`, `TickerText`, `DisguiseText`, `ScrambleText`, `WavyText` — all automatically inherit `theme.color` and `theme.fontFamily`.
