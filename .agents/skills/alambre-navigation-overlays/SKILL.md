---
name: alambre-navigation-overlays
description: Declarative screen navigation, subpages, confirmation dialogs, and toast notifications in alambre. Use whenever adding or modifying routes, navigating between pages or subpages (NavigatorProvider, useNavigator), showing toast notifications (ToastProvider, useToast), or prompting user confirmations (ConfirmProvider, useConfirm). Use this instead of expo-router.
---

# `alambre` Navigation, Toasts & Confirmation Dialogs

Applications built on `alambre` use a declarative, state-driven navigation and overlay system (`NavigatorProvider`, `ConfirmProvider`, `ToastProvider`) instead of file-based `expo-router`.

---

## 1. Root Provider Hierarchy (`App.tsx`)

Maintain this exact nesting order in `App.tsx` so that confirmation dialogs, toasts, and screens all have access to `@some-alambre/ui` theme and typography tokens:

```tsx
<ThemeProvider theme={{ ...theme, fontFamily: config.fontFamily }}>
  <NavigatorProvider pages={navigator}>
    <ConfirmProvider ConfirmComponent={ConfirmDialog}>
      <ToastProvider ToastComponent={TemplateToast}>
        <Root />
      </ToastProvider>
    </ConfirmProvider>
  </NavigatorProvider>
</ThemeProvider>
```

---

## 2. Registering Pages & Subpages (`src/navigator/navigator.tsx`)

Pages are defined as a dictionary of `AppPage` entries. Top-level pages represent main sections (e.g. `home`, `settings`), while `subpages` represent drill-down screens that automatically display the animated back-arrow header in `AppNavigatorBody`:

```tsx
import Home from '../views/home/Home';
import Details from '../views/home/Details';
import Settings from '../views/settings/Settings';
import type { Page } from 'alambre';
import type { AppLang } from '../providers/lang';

export type PageTitleFn = (lang: AppLang) => string;

export type AppPage = Page & {
  title?: PageTitleFn;
  subpages?: Record<string, AppPage>;
};

export const pages: Record<string, AppPage> = {
  home: {
    component: <Home />,
    subpages: {
      details: {
        title: (lang) => lang.details.title,
        component: <Details />,
      },
    },
  },
  settings: {
    title: (lang) => lang.settings.title,
    component: <Settings />,
  },
};

export default pages;
```

### Header Behavior in `Root.tsx` & `AppNavigatorBody.tsx`
- If the active page/subpage defines `title: (lang) => ...` and there is navigation history (`!noPreviousPages`), `AppNavigatorBody` renders the top header bar with the animated back arrow and localized title styled with `config.fontFamily`.
- Android hardware back presses are automatically intercepted by `AppNavigatorBody` when `!noPreviousPages`.

---

## 3. Navigating Between Screens (`useNavigator`)

```tsx
import { useNavigator } from 'alambre';

const {
  navigate,
  previous,
  currentPage,
  noPreviousPages,
  pageKey,
} = useNavigator();

// Navigate to a top-level page:
navigate('settings');

// Navigate to a nested subpage:
navigate('home', { subpage: 'details' });

// Go back to the previous screen in history:
previous();
```

---

## 4. Confirmation Dialogs (`useConfirm`)

`ConfirmProvider` is wired to `@some-alambre/ui`'s `ConfirmDialog` in `App.tsx`. Trigger promise-based confirmation modals from any component:

```tsx
import { useConfirm } from 'alambre';

const { confirm } = useConfirm();

const handleDelete = async () => {
  const accepted = await confirm({
    title: lang.settings.resetConfirmTitle,
    message: lang.settings.resetConfirmMessage,
    tone: 'danger', // 'default' | 'danger'
    confirmLabel: lang.settings.resetAction,
    cancelLabel: lang.common.back,
  });

  if (accepted) {
    // Perform destructive action
  }
};
```

---

## 5. Toast Notifications (`useToast`)

`ToastProvider` renders `TemplateToast` (`src/providers/toast.tsx`) with queue badges, swipe/tap dismissal, and optional action buttons:

```tsx
import { useToast } from 'alambre';

const { show, dismiss, clear } = useToast();

show({
  payload: {
    title: 'Saved successfully',
    message: 'Your preferences have been updated.',
    tone: 'success', // 'info' | 'success' | 'warning' | 'danger'
    action: {
      label: 'Undo',
      onPress: () => handleUndo(),
    },
  },
  duration: 3000,
});
```
