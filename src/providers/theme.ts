import { createLightDark } from 'alambre';
import { storage } from '../storage';

export const light = {
  color: '#2d2f2d', // ink
  background: '#ece6d6', // cream
  surface: '#f3eedf', // light cream
  surfaceAlt: '#d2bca8', // sand
  primary: '#475440', // dark sage
  primarySoft: '#c3ceb3', // sage
  onPrimary: '#ffffff',
  secondary: '#1d4ed8',
  secondarySoft: '#dbeafe',
  sand: '#a37042', // dark sand
  sandSoft: '#e0cdbb', // light sand
  border: '#8f938f',
  borderSoft: '#d6cfbd',
  muted: '#737a73',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#c16757', // rust
  dangerSoft: '#e2c5c0', // light rust
  overlay: 'rgba(45, 47, 45, 0.45)',
  overlayBar: 'rgba(45, 47, 45, 0.05)',
};

export const dark = {
  color: '#ece6d6', // cream
  background: '#1a1c1a', // super dark ink
  surface: '#252725', // dark surface
  surfaceAlt: '#3a352f', // dark sand
  primary: '#c3ceb3', // sage
  primarySoft: '#333b30', // dark sage soft
  onPrimary: '#1a1c1a',
  secondary: '#60a5fa',
  secondarySoft: '#1e355b',
  sand: '#d2bca8',
  sandSoft: '#3a352f',
  border: '#4d504d',
  borderSoft: '#313431',
  muted: '#a3a8a3',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#e2c5c0',
  dangerSoft: '#472d28',
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayBar: 'rgba(236, 230, 214, 0.15)',
};

export const { useLightDark, actions: { toggleTheme, setThemeName } } = createLightDark(light, dark, storage);

