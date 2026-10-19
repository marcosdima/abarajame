import { createConfig } from 'alambre';
import { storage } from '../storage';

const config = {
  greeting: 'Hello from alambre',
  fontFamily: 'Inter',
};

export const { useConfig, actions: { saveField } } = createConfig(
  config,
  storage,
);

